import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { RecruitmentValues } from "@/lib/validations/recruitment";

// Mirrors the layout/styling of the CT1 "Phiếu thông tin tuyển dụng" reference
// template (CT1_Phieu_thong_tin_tuyen_dung_v2.docx): Noto Sans 11pt body, 14pt
// title, single line spacing, "Trang N | Total" footer, and the same section
// ordering as the printed form.
const NAVY = "1F3864";
const BLUE = "004A7D";
const RED = "C0392B";
const GRAY = "595959";
const FOOTER_GRAY = "808080";
const WHITE = "FFFFFF";
const PAGE_W = 9360; // usable width (12240 - 1440*2)
const BODY_FONT = "Noto Sans";
const BODY_SIZE = 22; // 11pt
// Noto Sans draws a 300tw line where Calibri drew 253, so the 1.15 spacing
// this used to carry overflowed every page once the body moved to Noto Sans
// 11pt. The reference CT-01 sets 240 on nearly every paragraph — match it.
const LINE_SPACING = { line: 240, lineRule: LineRuleType.AUTO }; // 1.0
const LINE_SPACING_SINGLE = { line: 240, lineRule: LineRuleType.AUTO }; // 1.0

const CHECK_FONT = {
  ascii: "Segoe UI Symbol",
  eastAsia: "Segoe UI Symbol",
  hAnsi: "Segoe UI Symbol",
  cs: "Segoe UI Symbol",
};

function labelsOf(map: Record<string, string>): string[] {
  return Object.values(map);
}

function labelsFor(map: Record<string, string>, values?: string[] | null) {
  if (!values || values.length === 0) return new Set<string>();
  return new Set(values.map(v => map[v] ?? v));
}

function labelFor(map: Record<string, string>, value?: string | null) {
  if (!value) return undefined;
  return map[value] ?? value;
}

/**
 * The form stores dates as ISO (yyyy-mm-dd); a printed Vietnamese form wants
 * dd/mm/yyyy. Anything that is not an ISO date is passed through untouched.
 */
function vnDate(value?: string | null): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/**
 * The trailing "*" marks a required field on the web form. On paper it reads
 * as part of the label, so drop it wherever a form label is printed.
 */
function printableLabel(label: string) {
  return label.replace(/\s*\*\s*$/, "");
}

class DocxBuilder {
  private lineSpacing = LINE_SPACING;
  readonly children: (Paragraph | Table)[] = [];

  private sp(extra?: Record<string, unknown>) {
    return { ...this.lineSpacing, ...(extra ?? {}) };
  }

  useSingleSpacing() {
    this.lineSpacing = LINE_SPACING_SINGLE;
  }

  useNormalSpacing() {
    this.lineSpacing = LINE_SPACING;
  }

  push(...nodes: (Paragraph | Table)[]) {
    this.children.push(...nodes);
  }

  bannerLine(
    text: string,
    opts: { bold?: boolean; color?: string; after?: number }
  ) {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: this.sp({ after: opts.after ?? 0 }),
      children: [new TextRun({ text, bold: opts.bold, color: opts.color })],
    });
  }

  title(text: string) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: this.sp({ after: 60 }),
      children: [new TextRun({ text, bold: true, color: NAVY, size: 28 })],
    });
  }

  /**
   * `startsPage` breaks to a new page on the heading itself. A standalone
   * page-break paragraph would leave its own empty line sitting above the
   * heading, and if the previous page were full that stray line could spill
   * into a page of its own.
   */
  sectionHeading(text: string, startsPage = false, before = 200) {
    return new Paragraph({
      pageBreakBefore: startsPage,
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 },
      },
      spacing: this.sp({ before: startsPage ? 0 : before, after: 60 }),
      children: [new TextRun({ text, bold: true, color: BLUE })],
    });
  }

  subHeading(text: string) {
    return new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: "BFBFBF",
          space: 2,
        },
      },
      spacing: this.sp({ before: 160, after: 60 }),
      children: [new TextRun({ text, bold: true, italics: true })],
    });
  }

  field(label: string, value?: string | null) {
    return new Paragraph({
      spacing: this.sp({ after: 50 }),
      children: [
        new TextRun({ text: printableLabel(label) + ": " }),
        new TextRun({ text: value || "" }),
      ],
    });
  }

  twoField(
    label1: string,
    value1: string | undefined | null,
    label2: string,
    value2: string | undefined | null
  ) {
    const half = Math.round(PAGE_W / 2);
    return new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: half + 120 }],
      spacing: this.sp({ after: 50 }),
      children: [
        new TextRun({ text: printableLabel(label1) + ": " }),
        new TextRun({ text: value1 || "" }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: printableLabel(label2) + ": " }),
        new TextRun({ text: value2 || "" }),
      ],
    });
  }

  checkRun(label: string, checked: boolean, size?: number) {
    return [
      new TextRun({ text: checked ? "☑ " : "☐ ", font: CHECK_FONT, size }),
      new TextRun({ text: label, size }),
    ];
  }

  inlineChecks(labels: string[], selected: Set<string>) {
    const runs: TextRun[] = [];
    labels.forEach((l, i) => {
      if (i > 0) runs.push(new TextRun({ text: "      " }));
      runs.push(...this.checkRun(l, selected.has(l)));
    });
    return new Paragraph({ spacing: this.sp({ after: 50 }), children: runs });
  }

  stackedChecks(
    labels: string[],
    selected: Set<string>,
    opts: { size?: number; after?: number } = {}
  ) {
    return labels.map(
      l =>
        new Paragraph({
          spacing: this.sp({ after: opts.after ?? 30 }),
          indent: { left: 260 },
          children: this.checkRun(l, selected.has(l), opts.size),
        })
    );
  }

  bodyText(
    text: string,
    opts: {
      bold?: boolean;
      italics?: boolean;
      size?: number;
      after?: number;
    } = {}
  ) {
    return new Paragraph({
      spacing: this.sp({ after: opts.after ?? 60 }),
      children: [
        new TextRun({
          text,
          bold: opts.bold,
          italics: opts.italics,
          size: opts.size,
        }),
      ],
    });
  }

  headerCell(text: string, width: number) {
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: BLUE, color: "auto" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: this.sp(),
          children: [new TextRun({ text, bold: true, color: WHITE })],
        }),
      ],
    });
  }

  private bodyCell(text: string, width: number) {
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          spacing: this.sp(),
          children: [new TextRun({ text: text || "" })],
        }),
      ],
    });
  }

  dataTable(colWidths: number[], headers: string[], rows: string[][]) {
    return new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: headers.map((h, i) => this.headerCell(h, colWidths[i])),
        }),
        ...rows.map(
          r =>
            new TableRow({
              children: r.map((c, i) => this.bodyCell(c, colWidths[i])),
            })
        ),
      ],
    });
  }

  spacer() {
    return new Paragraph({ spacing: this.sp({ after: 40 }), children: [] });
  }

  /**
   * withInitials prints the per-page integrity box Legal asked for: the
   * candidate signs every page, not only the last one, so a page cannot be
   * swapped after signing. It sits in the footer so Word repeats it itself.
   */
  footer(withInitials = false) {
    const initials = withInitials
      ? [
          new Paragraph({
            border: {
              top: {
                style: BorderStyle.SINGLE,
                size: 4,
                color: "BFBFBF",
                space: 4,
              },
            },
            spacing: { ...this.lineSpacing, before: 60, after: 0 },
            children: [
              new TextRun({
                text: "XÁC NHẬN TÍNH TOÀN VẸN NỘI DUNG",
                bold: true,
                size: 16,
              }),
            ],
          }),
          new Paragraph({
            spacing: { ...this.lineSpacing, after: 0 },
            children: [
              new TextRun({
                text: "Ứng viên xác nhận đã đọc, rà soát và đồng ý với toàn bộ nội dung thể hiện tại trang này.",
                size: 16,
              }),
            ],
          }),
          new Paragraph({
            spacing: { ...this.lineSpacing, after: 0 },
            children: [
              new TextRun({
                text: "Ký nháy của ứng viên: ……………………………",
                size: 16,
              }),
            ],
          }),
        ]
      : [];
    return new Footer({
      children: [
        ...initials,
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          indent: { right: 260 },
          spacing: this.sp(),
          children: [
            new TextRun({ text: "Trang ", color: FOOTER_GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], color: FOOTER_GRAY }),
            new TextRun({ text: " | ", color: FOOTER_GRAY }),
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              color: FOOTER_GRAY,
            }),
          ],
        }),
      ],
    });
  }
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "phieu-thong-tin-tuyen-dung";
}

export async function buildRecruitmentDocxBlob(
  data: RecruitmentValues,
  dict: Dictionary
): Promise<Blob> {
  const f = dict.recruitmentForm;
  const opt = f.options;
  const s1 = f.section1;
  const s2 = f.section2;
  const s3 = f.section3;
  const s4 = f.section4;
  const s5 = f.section5;
  const s8 = f.section8;
  const s9 = f.section9;
  const s11 = f.section11;

  const b = new DocxBuilder();

  // ===== Banner =====
  b.push(
    b.bannerLine("MVI – HỒ SƠ ĐẠI LÝ", { bold: true, color: RED }),
    b.bannerLine("CT-01", { color: GRAY, after: 120 }),
    b.title("PHIẾU THÔNG TIN TUYỂN DỤNG")
  );

  // ===== SECTION 1: THÔNG TIN CÁ NHÂN =====
  b.push(b.sectionHeading("1. " + s1.title.toUpperCase()));
  b.push(b.field(s1.fullName, data.fullName));
  b.push(
    b.twoField(
      s1.dateOfBirth,
      vnDate(data.dateOfBirth),
      s1.taxCode,
      data.taxCode
    )
  );
  b.push(
    b.twoField(s1.idNumber, data.idNumber, s1.oldIdNumber, data.oldIdNumber)
  );
  b.push(b.twoField(s1.mobile1, data.mobile1, s1.email, data.email));
  b.push(
    b.bodyText(printableLabel(s1.genderLabel) + ":", { bold: true, after: 40 })
  );
  b.push(
    b.inlineChecks(
      [s1.genderMale, s1.genderFemale],
      labelsFor(
        { male: s1.genderMale, female: s1.genderFemale },
        data.gender ? [data.gender] : []
      )
    )
  );
  b.push(
    b.bodyText(printableLabel(s1.maritalStatusLabel) + ":", {
      bold: true,
      after: 40,
    })
  );
  b.push(
    b.inlineChecks(
      labelsOf(opt.maritalStatus),
      labelsFor(
        opt.maritalStatus,
        data.maritalStatus ? [data.maritalStatus] : []
      )
    )
  );
  b.push(
    b.bodyText(printableLabel(s1.educationLevelLabel) + ":", {
      bold: true,
      after: 40,
    })
  );
  b.push(
    b.inlineChecks(
      labelsOf(opt.education),
      labelsFor(opt.education, data.educationLevel ? [data.educationLevel] : [])
    )
  );
  b.push(
    b.bodyText(printableLabel(s1.averageMonthlyIncomeLabel) + ":", {
      bold: true,
      after: 40,
    })
  );
  b.push(
    b.inlineChecks(
      labelsOf(opt.income),
      labelsFor(
        opt.income,
        data.averageMonthlyIncome ? [data.averageMonthlyIncome] : []
      )
    )
  );
  b.push(
    b.bodyText(printableLabel(s1.civilServantLabel) + ":", {
      bold: true,
      after: 40,
    })
  );
  b.push(
    b.inlineChecks(
      [s1.civilServantNo, s1.civilServantYes],
      labelsFor(
        { no: s1.civilServantNo, yes: s1.civilServantYes },
        data.isCivilServant ? [data.isCivilServant] : []
      )
    )
  );
  if (data.isCivilServant === "yes" && data.civilServantType?.length) {
    b.push(
      b.bodyText(printableLabel(s1.civilServantTypeLabel) + ":", { after: 40 })
    );
    b.push(
      b.inlineChecks(
        labelsOf(opt.civilServantType),
        labelsFor(opt.civilServantType, data.civilServantType)
      )
    );
  }
  b.push(b.field(s1.accountHolderNameLabel, data.accountHolderName));
  b.push(
    b.twoField(
      "Số tài khoản (không phải số thẻ ATM)",
      data.bankAccountNumber,
      "Ngân hàng",
      data.bankName
    )
  );
  b.push(b.field(s1.branchLabel, data.branch));
  b.push(b.bodyText(s3.title + ":", { bold: true, after: 40 }));
  b.push(b.field(s3.provinceLabel, data.permanentProvince));
  b.push(b.field(s3.wardLabel, data.permanentWard));
  b.push(b.field(s3.streetLabel, data.permanentStreetAddress));
  b.push(b.bodyText(s4.title + ":", { bold: true, after: 40 }));
  const isDifferentAddress = data.sameAsPermanentAddress === "different";
  b.push(
    b.inlineChecks(
      [f.section4.same, f.section4.different],
      labelsFor(
        { same: f.section4.same, different: f.section4.different },
        data.sameAsPermanentAddress ? [data.sameAsPermanentAddress] : ["same"]
      )
    )
  );
  if (isDifferentAddress) {
    b.push(b.field(s4.provinceLabel, data.temporaryProvince));
    b.push(b.field(s4.wardLabel, data.temporaryWard));
    b.push(b.field(s4.streetLabel, data.temporaryStreetAddress));
  }
  // SH manages the region the SD sits in, so the printed form lists them in
  // that order — same as the web form and the paper CT-01.
  if (data.secondManagerName) {
    b.push(b.field(s1.secondManagerLabel, data.secondManagerName));
  }
  if (data.sdManagerName) {
    b.push(b.field(s1.sdManagerLabel, data.sdManagerName));
  }
  if (data.managerName) {
    b.push(b.field(s1.managerLabel, data.managerName));
  }

  // ===== SECTION 2: THÔNG TIN TUYỂN DỤNG =====
  b.push(b.sectionHeading("2. " + s2.title.toUpperCase(), true));
  b.push(
    b.bodyText(printableLabel(s2.channelLabel) + ":", { bold: true, after: 40 })
  );
  b.push(
    b.inlineChecks(
      labelsOf(opt.channel),
      labelsFor(opt.channel, data.channel ? [data.channel] : [])
    )
  );
  if (data.channel === "agency") {
    b.push(
      b.bodyText(printableLabel(s2.agencyTypeLabel) + ":", {
        bold: true,
        after: 40,
      })
    );
    b.push(b.bodyText(s2.agencyTypeNotice, { italics: true, after: 40 }));
    b.push(
      b.inlineChecks(
        labelsOf(opt.agencyType),
        labelsFor(opt.agencyType, data.agencyType ? [data.agencyType] : [])
      )
    );
  }
  b.push(
    b.bodyText(printableLabel(s2.positionLabel) + ":", {
      bold: true,
      after: 40,
    })
  );
  // All four on one line measures 10895tw against a 9360tw text width, so they
  // go two per line the way the printed CT-01 lays them out.
  const positionSelected = labelsFor(
    opt.position,
    data.positionApplied ? [data.positionApplied] : []
  );
  b.push(
    b.inlineChecks(
      [opt.position.agent, opt.position.unit_manager],
      positionSelected
    )
  );
  b.push(
    b.inlineChecks([opt.position.gad, opt.position.other], positionSelected)
  );
  b.push(b.bodyText(s2.basicAgentCertificateLabel, { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      [s2.no, s2.yes],
      labelsFor(
        { no: s2.no, yes: s2.yes },
        data.hasBasicAgentCertificate ? [data.hasBasicAgentCertificate] : []
      )
    )
  );
  b.push(
    b.bodyText(printableLabel(s2.programLabel) + ":", {
      bold: true,
      after: 40,
    })
  );
  b.push(
    b.inlineChecks(
      [s2.no, s2.yes],
      labelsFor(
        { no: s2.no, yes: s2.yes },
        data.participatingProgram ? [data.participatingProgram] : []
      )
    )
  );
  if (data.participatingProgram === "yes" && data.programTypes?.length) {
    b.push(
      ...b.stackedChecks(
        labelsOf(opt.program),
        labelsFor(opt.program, data.programTypes)
      )
    );
  }
  b.push(b.bodyText(printableLabel(s2.rehireLabel), { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      [s2.no, s2.yes],
      labelsFor(
        { no: s2.no, yes: s2.yes },
        data.isRehire ? [data.isRehire] : []
      )
    )
  );
  if (data.recruiterName || data.recruiterCode) {
    b.push(
      b.twoField(
        s2.recruiterCode,
        data.recruiterCode,
        s2.recruiterName,
        data.recruiterName
      )
    );
  }
  if (data.referrerName || data.referrerCode) {
    b.push(
      b.twoField(
        s2.referrerCode,
        data.referrerCode,
        s2.referrerName,
        data.referrerName
      )
    );
  }
  b.push(b.field(s1.potentialCustomers, data.potentialCustomers));

  b.push(b.subHeading(s5.title));
  b.push(
    b.bodyText(printableLabel(s5.hasInsuranceExperienceLabel) + ":", {
      after: 40,
    })
  );
  b.push(
    b.inlineChecks(
      [s5.no, s5.yes],
      labelsFor(
        { no: s5.no, yes: s5.yes },
        data.hasInsuranceExperience ? [data.hasInsuranceExperience] : []
      )
    )
  );
  b.push(b.spacer());
  const workRows = (data.workHistory?.length ? data.workHistory : [{}]).map(
    (w, i) => [
      s5.companyHeading(i + 1),
      w.fromDate || "",
      w.toDate || "",
      w.title || "",
      w.companyNameAddress || "",
    ]
  );
  b.push(
    b.dataTable(
      [2100, 1400, 1400, 1900, 2560],
      ["", s5.fromDate, s5.toDate, s5.jobTitle, s5.companyNameAddress],
      workRows
    )
  );

  b.push(b.bodyText(s8.title, { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      [s8.no, s8.yes],
      labelsFor(
        { no: s8.no, yes: s8.yes },
        data.hasRelativeAtCompany === "yes" ? ["yes"] : ["no"]
      )
    )
  );
  if (data.hasRelativeAtCompany === "yes") {
    const familyRows = (
      data.familyMembers?.length ? data.familyMembers : [{}]
    ).map((m, i) => [
      String(i + 1),
      m.name || "",
      labelFor(opt.relationship, m.relationship) || "",
      m.idNumber || "",
      m.occupation || "",
    ]);
    b.push(
      b.dataTable(
        [700, 3000, 2160, 1500, 2000],
        ["STT", s8.name, s8.relationshipLabel, s8.idNumber, s8.occupation],
        familyRows
      )
    );
  }

  // ===== SECTION 3: CAM KẾT CỦA ỨNG VIÊN =====
  // Pinned to its own page. Without the break it flows on from section 2,
  // so how much the candidate typed above decides where it lands — and a
  // long address or extra work-history rows can split the signature table
  // across two pages.
  b.push(b.sectionHeading("3. " + f.section11.title.toUpperCase(), true));
  const commitments: [string, boolean][] = [
    [s11.truthful, !!data.commitmentTruthful],
    [s11.voluntary, !!data.commitmentVoluntary],
    [s11.maskedData, !!data.commitmentMaskedData],
    [s11.eligibility, !!data.commitmentEligibility],
  ];
  for (const [label, checked] of commitments) {
    b.push(
      new Paragraph({
        spacing: { after: 30, ...LINE_SPACING },
        indent: { left: 260 },
        children: b.checkRun(label, checked),
      })
    );
  }
  b.push(b.bodyText(s11.noticeIntro, { after: 40 }));
  const notices: [string, boolean][] = [
    [s11.noticeOperational, !!data.noticeOperational],
    [s11.noticePrograms, !!data.noticePrograms],
  ];
  for (const [label, checked] of notices) {
    b.push(
      new Paragraph({
        spacing: { after: 30, ...LINE_SPACING },
        indent: { left: 260 },
        children: b.checkRun(label, checked),
      })
    );
  }
  b.push(b.subHeading(s11.pdpdHeading));
  b.push(b.bodyText(s11.pdpdIntro, { italics: true, after: 40 }));
  for (const item of s11.pdpdInfo) {
    b.push(b.bodyText("- " + item.label + " " + item.text, { after: 40 }));
    for (const sub of item.items) {
      b.push(
        new Paragraph({
          spacing: { ...LINE_SPACING, after: 40 },
          indent: { left: 360 },
          children: [new TextRun({ text: sub })],
        })
      );
    }
  }
  b.push(b.bodyText(s11.consentInstruction, { bold: true, after: 60 }));
  const consents: [string, boolean][] = [
    [s11.consentBasicData, !!data.consentBasicData],
    [s11.consentSensitiveData, !!data.consentSensitiveData],
    [s11.consentThirdParty, !!data.consentThirdParty],
  ];
  for (const [label, checked] of consents) {
    b.push(
      new Paragraph({
        spacing: { after: 30, ...LINE_SPACING },
        indent: { left: 260 },
        children: b.checkRun(label, checked),
      })
    );
  }
  for (const party of s11.consentThirdPartyParties) {
    b.push(
      new Paragraph({
        spacing: { after: 20, ...LINE_SPACING },
        indent: { left: 620, hanging: 200 },
        children: [new TextRun({ text: "•   " + party })],
      })
    );
  }
  b.push(b.bodyText(s11.consentThirdPartyNote, { after: 40 }));
  b.push(
    new Paragraph({
      spacing: { before: 120, after: 60, ...LINE_SPACING },
      indent: { left: 260 },
      children: b.checkRun(s11.reviewedEntry, !!data.commitmentReviewedEntry),
    })
  );
  b.push(b.field("Ngày ký", "…………………………………………………"));
  b.push(b.spacer(), b.spacer());

  const sigWidth = Math.round(PAGE_W / 2);
  const sigHeaderCell = (text: string, declaration?: string) =>
    new TableCell({
      width: { size: sigWidth, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: BLUE, color: "auto" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 55, bottom: 55, left: 105, right: 105 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { ...LINE_SPACING, after: declaration ? 60 : 0 },
          children: [new TextRun({ text, bold: true, color: WHITE })],
        }),
        // What the manager is attesting to belongs above their signature, not
        // in a separate paragraph they can sign without reading.
        ...(declaration
          ? [
              new Paragraph({
                alignment: AlignmentType.BOTH,
                spacing: LINE_SPACING,
                children: [
                  new TextRun({
                    text: declaration,
                    italics: true,
                    color: WHITE,
                  }),
                ],
              }),
            ]
          : []),
      ],
    });
  const sigBodyCell = (name: string | undefined, time: string | undefined) =>
    new TableCell({
      width: { size: sigWidth, type: WidthType.DXA },
      margins: { top: 55, bottom: 55, left: 105, right: 105 },
      children: [
        new Paragraph({
          spacing: { after: 90, ...LINE_SPACING },
          children: [new TextRun({ text: "Chữ ký:", bold: true })],
        }),
        b.spacer(),
        b.spacer(),
        new Paragraph({
          spacing: { after: 90, ...LINE_SPACING },
          children: [
            new TextRun({
              text: `Tên: ${name || "…………………………………………………………."}`,
            }),
          ],
        }),
        new Paragraph({
          spacing: LINE_SPACING,
          children: [
            new TextRun({
              text: `Thời gian: ${time || "…………………………………………………."}`,
            }),
          ],
        }),
      ],
    });
  b.push(
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [sigWidth, sigWidth],
      rows: [
        new TableRow({
          children: [
            sigHeaderCell("ỨNG VIÊN"),
            sigHeaderCell("QUẢN LÝ TRỰC TIẾP", s11.managerDeclaration),
          ],
        }),
        new TableRow({
          children: [
            sigBodyCell(undefined, undefined),
            sigBodyCell(undefined, undefined),
          ],
        }),
      ],
    })
  );

  // ===== PHỤ LỤC 1: BỘ CÂU HỎI KHẢO SÁT =====
  b.useSingleSpacing();
  b.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { ...LINE_SPACING_SINGLE, after: 0 },
      children: [
        new TextRun({ text: "PHỤ LỤC 1", bold: true, color: NAVY, size: 28 }),
      ],
    })
  );
  b.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { ...LINE_SPACING_SINGLE, after: 120 },
      children: [
        new TextRun({
          text: "BỘ CÂU HỎI KHẢO SÁT",
          bold: true,
          color: NAVY,
          size: 28,
        }),
      ],
    })
  );

  // The appendix has to land on a single page, so it runs a step smaller than
  // the body and leans on paragraph spacing instead of blank spacer lines.
  const APPENDIX_SIZE = 18; // 9pt

  function questionLabel(label: string) {
    return new Paragraph({
      spacing: { ...LINE_SPACING_SINGLE, before: 80, after: 30 },
      children: [new TextRun({ text: label, bold: true, size: APPENDIX_SIZE })],
    });
  }

  function questionChecklist(
    label: string,
    options: string[],
    selected: Set<string>
  ) {
    b.push(questionLabel(label));
    b.push(
      ...b.stackedChecks(options, selected, { size: APPENDIX_SIZE, after: 20 })
    );
  }

  function questionFreeText(label: string, value?: string | null) {
    b.push(questionLabel(label));
    b.push(
      new Paragraph({
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: "000000",
            space: 4,
          },
        },
        spacing: { ...LINE_SPACING_SINGLE, after: 60 },
        children: [new TextRun({ text: value || "", size: APPENDIX_SIZE })],
      })
    );
  }

  questionChecklist(
    s9.q1Label,
    labelsOf(opt.q1),
    labelsFor(opt.q1, data.q1Experience)
  );
  questionChecklist(
    s9.q2Label,
    labelsOf(opt.q2),
    labelsFor(opt.q2, data.q2View)
  );
  questionChecklist(
    s9.q3Label,
    labelsOf(opt.q3),
    labelsFor(opt.q3, data.q3TargetAudience)
  );
  questionFreeText(s9.q4Label, data.q4FirstTenPeople);
  questionChecklist(
    s9.q5Label.replace(" *", ""),
    labelsOf(opt.training),
    labelsFor(opt.training, data.q5Training)
  );
  questionChecklist(
    s9.q6Label,
    labelsOf(opt.q6),
    labelsFor(opt.q6, data.q6Support)
  );
  questionChecklist(
    s9.q7Label,
    labelsOf(opt.referral),
    labelsFor(opt.referral, data.referralChannel)
  );

  b.useNormalSpacing();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 },
          },
        },
        footers: { default: b.footer(true) },
        children: b.children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE },
          paragraph: { spacing: LINE_SPACING },
        },
      },
    },
  });

  return Packer.toBlob(doc);
}

// ===========================================================================
// CT-02: PHIẾU CAM KẾT & ĐĂNG KÝ CHỮ KÝ MẪU
// ===========================================================================

// The commitments are legal wording that only ever appears on the printed
// page — never on screen — so they live here rather than in the dictionary
// the form reads from.
const CT02_COMMITMENTS = [
  "Đồng ý nhận mọi thông báo từ MVI qua SMS/Zalo/email theo số điện thoại và email đã đăng ký trên Phiếu đăng ký Đại lý.",
  "Cam kết là công dân Việt Nam thường trú tại Việt Nam; có năng lực hành vi dân sự đầy đủ; không đang làm đại lý bảo hiểm cho doanh nghiệp bảo hiểm nhân thọ khác trong thời gian là đại lý bảo hiểm của MVI; không đang bị truy cứu trách nhiệm hình sự, không đang chấp hành hình phạt tù, không đang chấp hành hình phạt cấm hành nghề liên quan đến lĩnh vực bảo hiểm.",
  "Đồng ý để MVI thu thập, lưu trữ, xử lý dữ liệu cá nhân theo Chính sách Bảo vệ Dữ liệu Cá nhân.",
  "Đã đọc, hiểu và đồng ý với toàn bộ Điều khoản & Điều kiện, các phụ lục Hợp đồng Đại lý của MVI tại thời điểm ký kết; các sửa đổi, bổ sung sau này (nếu có) sẽ được MVI thông báo và chỉ có hiệu lực với Anh/Chị sau khi được Anh/Chị xác nhận đồng ý theo cơ chế do MVI quy định.",
  "Chịu trách nhiệm về tính chính xác, trung thực của thông tin đã cung cấp trong hồ sơ này.",
  "Ứng viên chính thức trở thành đại lý của MVI sau khi hoàn tất chứng chỉ đại lý bảo hiểm theo quy định của Bộ Tài chính và được MVI phê duyệt hồ sơ đăng ký đại lý.",
];

const DOTS = "…………………………";

export async function buildCt02DocxBlob(
  data: RecruitmentValues
): Promise<Blob> {
  const b = new DocxBuilder();

  b.push(
    b.bannerLine("MVI – HỒ SƠ ĐẠI LÝ", { bold: true, color: RED }),
    b.bannerLine("CT-02", { color: GRAY }),
    b.title("PHIẾU CAM KẾT & ĐĂNG KÝ CHỮ KÝ MẪU")
  );

  b.push(b.field("Họ và tên ứng viên", data.fullName));
  // The LPFC class is assigned after the application is processed, so it is
  // always left blank for the candidate to fill in by hand.
  b.push(b.field("Lớp LPFC", DOTS.repeat(2)));
  b.push(
    b.twoField("Số CCCD", data.idNumber, "CMND (nếu có)", data.oldIdNumber)
  );

  b.push(b.sectionHeading("CAM KẾT CỦA ỨNG VIÊN", false, 120));
  for (const text of CT02_COMMITMENTS) {
    b.push(
      new Paragraph({
        spacing: { ...LINE_SPACING, after: 40 },
        indent: { left: 260, hanging: 260 },
        children: [new TextRun({ text: "•   " + text })],
      })
    );
  }

  b.push(b.sectionHeading("ĐĂNG KÝ CHỮ KÝ MẪU", false, 120));
  b.push(
    b.bodyText(
      "Tôi đồng ý và xác nhận MVI có thể sử dụng các chữ ký mẫu dưới đây để xác thực và xử lý các giao dịch liên quan đến Hợp đồng Đại lý giữa tôi và MVI.",
      { after: 40 }
    )
  );

  const third = Math.round(PAGE_W / 3);
  const signatureBox = () =>
    new TableCell({
      width: { size: third, type: WidthType.DXA },
      margins: { top: 55, bottom: 55, left: 105, right: 105 },
      children: [b.spacer(), b.spacer()],
    });
  b.push(
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [third, third, third],
      rows: [
        new TableRow({
          children: [
            b.headerCell("Mẫu chữ ký 1 (*)", third),
            b.headerCell("Mẫu chữ ký 2 (*)", third),
            b.headerCell("Mẫu chữ ký 3 (*)", third),
          ],
        }),
        new TableRow({
          children: [signatureBox(), signatureBox(), signatureBox()],
        }),
      ],
    })
  );
  b.push(
    b.bodyText("(*) Phải trùng khớp với chữ ký trên Phiếu đăng ký đại lý.", {
      italics: true,
      after: 60,
    })
  );

  const half = Math.round(PAGE_W / 2);
  const signOffCell = (heading: string, note?: string) =>
    new TableCell({
      width: { size: half, type: WidthType.DXA },
      margins: { top: 55, bottom: 55, left: 105, right: 105 },
      children: [
        new Paragraph({
          spacing: { ...LINE_SPACING, after: 40 },
          children: [new TextRun({ text: heading, bold: true })],
        }),
        ...(note
          ? [
              new Paragraph({
                spacing: { ...LINE_SPACING, after: 40 },
                children: [new TextRun({ text: note, italics: true })],
              }),
            ]
          : []),
        new Paragraph({
          spacing: { ...LINE_SPACING, after: 40 },
          children: [
            new TextRun({
              text: "(ký, ghi rõ họ tên)",
              italics: true,
            }),
          ],
        }),
        b.spacer(),
        b.spacer(),
        new Paragraph({
          spacing: LINE_SPACING,
          children: [new TextRun({ text: "Ngày: " + DOTS })],
        }),
      ],
    });
  b.push(
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [half, half],
      rows: [
        new TableRow({
          children: [
            signOffCell("ỨNG VIÊN"),
            signOffCell(
              "XÁC NHẬN CỦA SD/SH",
              "Tôi xác nhận đã kiểm tra CCCD của ứng viên và ứng viên đã ký trực tiếp vào phiếu này."
            ),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 },
          },
        },
        footers: { default: b.footer() },
        children: b.children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE },
          paragraph: { spacing: LINE_SPACING },
        },
      },
    },
  });

  return Packer.toBlob(doc);
}

const CT03_CRITERIA = [
  "1. Giới thiệu bản thân & kinh nghiệm (giao tiếp, kinh nghiệm bán hàng; ngoại hình, tác phong)",
  "2. Lý do quan tâm công ty & vị trí ứng tuyển; sự phù hợp văn hóa; mục tiêu nghề nghiệp rõ ràng",
  "3. Mức độ tham gia cộng đồng; khả năng mở rộng quan hệ; thị trường khách hàng tiềm năng",
  "4. Tình huống thuyết phục thành công; kỹ năng thuyết phục & xử lý từ chối",
  "5. Tình huống vượt qua khởi đầu khó khăn để cải thiện quan hệ; xử lý tình huống & sự kiên trì",
];

/**
 * Total years covered by the declared work history, rounded to one decimal.
 * Dates are the "MM/YYYY" the form asks for; anything else is skipped rather
 * than guessed at, and an empty history prints nothing at all.
 */
function totalExperienceYears(history?: RecruitmentValues["workHistory"]) {
  const monthsOf = (value?: string | null) => {
    const m = /^(\d{1,2})\/(\d{4})$/.exec((value ?? "").trim());
    return m ? Number(m[2]) * 12 + Number(m[1]) : null;
  };
  let months = 0;
  for (const row of history ?? []) {
    const from = monthsOf(row?.fromDate);
    const to = monthsOf(row?.toDate);
    if (from === null || to === null || to < from) continue;
    months += to - from;
  }
  if (months === 0) return "";
  // Vietnamese decimal separator, since this is printed, not parsed.
  return String(Math.round((months / 12) * 10) / 10).replace(".", ",");
}

export async function buildCt03DocxBlob(
  data: RecruitmentValues,
  dict: Dictionary
): Promise<Blob> {
  const opt = dict.recruitmentForm.options;
  const s1 = dict.recruitmentForm.section1;
  const b = new DocxBuilder();

  b.push(
    b.bannerLine("MVI – HỒ SƠ ĐẠI LÝ", { bold: true, color: RED }),
    b.bannerLine("CT-03", { color: GRAY }),
    b.title("PHIẾU ĐÁNH GIÁ ỨNG VIÊN")
  );

  b.push(b.sectionHeading("THÔNG TIN ỨNG VIÊN", false, 120));
  b.push(
    b.twoField(
      "Họ và tên",
      data.fullName,
      "Số CCCD/CMND",
      data.idNumber || data.oldIdNumber
    )
  );
  b.push(
    b.twoField(
      "Ngày sinh",
      vnDate(data.dateOfBirth),
      "Giới tính",
      data.gender === "male"
        ? s1.genderMale
        : data.gender === "female"
          ? s1.genderFemale
          : ""
    )
  );
  b.push(
    b.twoField(
      "Tình trạng hôn nhân",
      labelFor(opt.maritalStatus, data.maritalStatus),
      "Học vấn",
      labelFor(opt.education, data.educationLevel)
    )
  );
  b.push(
    b.twoField(
      "Kinh nghiệm làm việc (số năm)",
      totalExperienceYears(data.workHistory),
      "Thu nhập",
      labelFor(opt.income, data.averageMonthlyIncome)
    )
  );

  b.push(
    b.twoField(
      "Mã số người tuyển dụng",
      data.recruiterCode,
      "Họ tên người tuyển dụng",
      data.recruiterName
    )
  );
  b.push(
    b.twoField(
      "Mã số người giới thiệu (nếu có)",
      data.referrerCode,
      "Họ tên người giới thiệu",
      data.referrerName
    )
  );

  b.push(
    b.bodyText(
      "Thang điểm: 1 – Rất kém; 2 – Trung bình; 3 – Khá; 4 – Tốt; 5 – Rất tốt",
      { italics: true, after: 120 }
    )
  );

  const scoreW = 1600;
  const criteriaW = PAGE_W - scoreW;
  b.push(
    b.dataTable(
      [criteriaW, scoreW],
      ["CÂU HỎI / TIÊU CHÍ", "ĐIỂM (1–5)"],
      [...CT03_CRITERIA.map(c => [c, ""]), ["TỔNG ĐIỂM", ""]]
    )
  );

  b.push(
    new Paragraph({
      spacing: { ...LINE_SPACING, before: 160, after: 40 },
      children: [
        new TextRun({ text: "KẾT QUẢ: ", bold: true }),
        ...b.checkRun("Đậu", false),
        new TextRun({ text: "      " }),
        ...b.checkRun("Rớt", false),
        new TextRun({
          text: "   (Đậu: Tổng điểm ≥15đ và không có tiêu chí nào có điểm =1)",
          italics: true,
        }),
      ],
    })
  );

  b.push(b.bodyText("Nhận xét:", { bold: true, after: 40 }));
  for (let i = 0; i < 3; i += 1) {
    b.push(b.bodyText(DOTS.repeat(5), { after: 40 }));
  }

  b.push(
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [PAGE_W],
      rows: [
        new TableRow({
          children: [b.headerCell("QUẢN LÝ TRỰC TIẾP", PAGE_W)],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_W, type: WidthType.DXA },
              margins: { top: 55, bottom: 55, left: 105, right: 105 },
              children: [
                b.bodyText("Chữ ký:", { after: 40 }),
                b.spacer(),
                b.spacer(),
                b.bodyText("Tên: " + DOTS.repeat(2), { after: 40 }),
                b.bodyText("Thời gian: " + DOTS.repeat(2), { after: 0 }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 },
          },
        },
        footers: { default: b.footer() },
        children: b.children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE },
          paragraph: { spacing: LINE_SPACING },
        },
      },
    },
  });

  return Packer.toBlob(doc);
}

const CT04_SECTIONS = [
  {
    title: "1. Giới thiệu bản thân (2 phút)",
    startsPage: false,
    criteria: [
      "1.1 Khả năng trình bày",
      "1.2 Cấu trúc & sự rõ ràng",
      "1.3 Ngoại hình",
      "1.4 Tác phong (giao tiếp mắt, giọng nói, cử chỉ)",
    ],
  },
  {
    title: "2. Hỏi đáp (5 phút)",
    startsPage: false,
    criteria: [
      "2.1 Thái độ (xử lý từ chối)",
      "2.2 Quan hệ xã hội (theo danh sách P50/P100)",
      "2.3 Quyết tâm và cam kết",
      "2.4 Thời gian sinh sống tại địa phương",
      "2.5 Kiến thức/kinh nghiệm bảo hiểm",
      "2.6 Hoàn cảnh gia đình & sự ủng hộ",
    ],
  },
  {
    title: "3. Năng lực — chọn 1 chủ đề trình bày (2 phút)",
    startsPage: true,
    criteria: [
      "3.1 Quản lý thời gian",
      "3.2 Cấu trúc & sự rõ ràng",
      "3.3 Hiệu quả",
      "3.4 Tính sáng tạo",
    ],
  },
];

const SCORE_W = 1600;

export async function buildCt04DocxBlob(
  data: RecruitmentValues,
  dict: Dictionary
): Promise<Blob> {
  const opt = dict.recruitmentForm.options;
  const s1 = dict.recruitmentForm.section1;
  const b = new DocxBuilder();
  const criteriaW = PAGE_W - SCORE_W;

  b.push(
    b.bannerLine("MVI – HỒ SƠ ĐẠI LÝ", { bold: true, color: RED }),
    b.bannerLine("CT-04", { color: GRAY }),
    b.title("PHIẾU ĐÁNH GIÁ & PHÊ DUYỆT TUYỂN DỤNG")
  );

  b.push(b.sectionHeading("THÔNG TIN ỨNG VIÊN", false, 120));
  b.push(
    b.twoField(
      "Họ và tên",
      data.fullName,
      "Số CCCD",
      data.idNumber || data.oldIdNumber
    )
  );
  b.push(
    b.twoField(
      "Ngày sinh",
      vnDate(data.dateOfBirth),
      "Giới tính",
      data.gender === "male"
        ? s1.genderMale
        : data.gender === "female"
          ? s1.genderFemale
          : ""
    )
  );
  b.push(
    b.twoField(
      "Tình trạng hôn nhân",
      labelFor(opt.maritalStatus, data.maritalStatus),
      "Học vấn",
      labelFor(opt.education, data.educationLevel)
    )
  );
  b.push(
    b.twoField(
      "Kinh nghiệm làm việc",
      totalExperienceYears(data.workHistory),
      "Thu nhập",
      labelFor(opt.income, data.averageMonthlyIncome)
    )
  );
  b.push(
    b.twoField(
      "Mã số người tuyển dụng",
      data.recruiterCode,
      "Họ tên người tuyển dụng",
      data.recruiterName
    )
  );
  b.push(
    b.twoField(
      "Mã số người giới thiệu (nếu có)",
      data.referrerCode,
      "Họ tên người giới thiệu",
      data.referrerName
    )
  );
  b.push(
    b.field(
      "Loại hình tuyển dụng",
      labelFor(opt.agencyType, data.agencyType) ??
        labelFor(opt.channel, data.channel)
    )
  );

  b.push(
    b.bodyText(
      "Thang điểm: 1 – Chưa đạt; 2 – Trung bình; 3 – Tốt; 4 – Rất tốt; 5 – Xuất sắc",
      { italics: true, after: 120 }
    )
  );

  for (const section of CT04_SECTIONS) {
    b.push(
      new Paragraph({
        pageBreakBefore: section.startsPage,
        spacing: { ...LINE_SPACING, after: 60 },
        children: [new TextRun({ text: section.title, bold: true })],
      })
    );
    b.push(
      b.dataTable(
        [criteriaW, SCORE_W],
        ["CÂU HỎI / TIÊU CHÍ", "ĐIỂM (1–5)"],
        [...section.criteria.map(c => [c, ""]), ["TỔNG ĐIỂM", ""]]
      )
    );
    b.push(b.spacer());
  }

  b.push(
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [criteriaW, SCORE_W],
      rows: [
        new TableRow({
          children: [
            b.headerCell("TỔNG ĐIỂM (1) + (2) + (3)", criteriaW),
            new TableCell({
              width: { size: SCORE_W, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({ spacing: LINE_SPACING, children: [] }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  b.push(
    b.bodyText("4. Đánh giá tổng thể & quyết định", {
      bold: true,
      after: 60,
    })
  );
  b.push(
    new Paragraph({
      spacing: { ...LINE_SPACING, after: 40 },
      children: [
        new TextRun({ text: "Kết quả: ", bold: true }),
        ...b.checkRun("Chấp thuận tuyển dụng", false),
        new TextRun({ text: "      " }),
        ...b.checkRun("Từ chối", false),
      ],
    })
  );
  b.push(
    b.bodyText(
      "(chấp nhận tuyển dụng: Tổng điểm ≥42đ và không có tiêu chí nào có điểm =1)",
      { italics: true, after: 80 }
    )
  );
  b.push(b.bodyText("Chức danh: " + DOTS.repeat(3), { after: 80 }));

  b.push(
    b.bodyText("Ghi chú (bắt buộc nếu từ chối ứng viên):", {
      bold: true,
      after: 40,
    })
  );
  for (let i = 0; i < 3; i += 1) {
    b.push(b.bodyText(DOTS.repeat(5), { after: 40 }));
  }

  b.push(
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [PAGE_W],
      rows: [
        new TableRow({
          children: [b.headerCell("NGƯỜI PHÊ DUYỆT (SD/SH)", PAGE_W)],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_W, type: WidthType.DXA },
              margins: { top: 55, bottom: 55, left: 105, right: 105 },
              children: [
                b.bodyText("Chữ ký:", { after: 40 }),
                b.spacer(),
                b.spacer(),
                b.bodyText("Tên: " + DOTS.repeat(2), { after: 40 }),
                b.bodyText("Thời gian: " + DOTS.repeat(2), { after: 0 }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 },
          },
        },
        footers: { default: b.footer() },
        children: b.children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE },
          paragraph: { spacing: LINE_SPACING },
        },
      },
    },
  });

  return Packer.toBlob(doc);
}
