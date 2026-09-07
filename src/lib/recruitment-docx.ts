import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LineRuleType,
  Packer,
  PageBreak,
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
// template (CT1_Phieu_thong_tin_tuyen_dung_v2.docx): Calibri 10pt body, 14pt
// title, 1.15 line spacing (1.0 in the survey appendix), "Trang N | Total"
// footer, and the same section ordering as the printed form.
const NAVY = "1F3864";
const BLUE = "004A7D";
const RED = "C0392B";
const GRAY = "595959";
const FOOTER_GRAY = "808080";
const WHITE = "FFFFFF";
const PAGE_W = 9360; // usable width (12240 - 1440*2)
const BODY_FONT = "Calibri";
const BODY_SIZE = 20; // 10pt
const LINE_SPACING = { line: 276, lineRule: LineRuleType.AUTO }; // 1.15
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

  pageBreak() {
    this.children.push(new Paragraph({ children: [new PageBreak()] }));
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

  sectionHeading(text: string) {
    return new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 },
      },
      spacing: this.sp({ before: 200, after: 60 }),
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
        new TextRun({ text: label + ": " }),
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
        new TextRun({ text: label1 + ": " }),
        new TextRun({ text: value1 || "" }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: label2 + ": " }),
        new TextRun({ text: value2 || "" }),
      ],
    });
  }

  checkRun(label: string, checked: boolean) {
    return [
      new TextRun({ text: checked ? "☑ " : "☐ ", font: CHECK_FONT }),
      new TextRun({ text: label }),
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

  stackedChecks(labels: string[], selected: Set<string>) {
    return labels.map(
      l =>
        new Paragraph({
          spacing: this.sp({ after: 30 }),
          indent: { left: 260 },
          children: this.checkRun(l, selected.has(l)),
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

  private headerCell(text: string, width: number) {
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

  blankLine() {
    return new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: "000000",
          space: 4,
        },
      },
      spacing: this.sp({ after: 160 }),
      children: [],
    });
  }

  footer() {
    return new Footer({
      children: [
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
    .replace(/đ/gi, "d")
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
  const s5 = f.section5;
  const s7 = f.section7;
  const s8 = f.section8;
  const s9 = f.section9;
  const s11 = f.section11;

  const b = new DocxBuilder();

  // ===== Banner =====
  b.push(
    b.bannerLine("ASAHI LIFE – HỒ SƠ ĐẠI LÝ", { bold: true, color: RED }),
    b.bannerLine("CT-01", { color: GRAY, after: 120 }),
    b.title("PHIẾU THÔNG TIN TUYỂN DỤNG")
  );

  // ===== SECTION 1: THÔNG TIN CÁ NHÂN =====
  b.push(b.sectionHeading("1. " + s1.title.toUpperCase()));
  b.push(b.field("Họ và tên", data.fullName));
  b.push(
    b.twoField(
      "Ngày sinh",
      data.dateOfBirth,
      "Mã số thuế (nếu có)",
      data.taxCode
    )
  );
  b.push(
    b.twoField("Số CCCD", data.idNumber, "Số CMND (nếu có)", data.oldIdNumber)
  );
  b.push(b.twoField("Di động (chính chủ)", data.mobile1, "Email", data.email));
  b.push(b.bodyText("Giới tính:", { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      [s1.genderMale, s1.genderFemale],
      labelsFor(
        { male: s1.genderMale, female: s1.genderFemale },
        data.gender ? [data.gender] : []
      )
    )
  );
  b.push(b.bodyText("Tình trạng hôn nhân:", { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      labelsOf(opt.maritalStatus),
      labelsFor(
        opt.maritalStatus,
        data.maritalStatus ? [data.maritalStatus] : []
      )
    )
  );
  b.push(b.bodyText("Trình độ học vấn:", { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      labelsOf(opt.education),
      labelsFor(opt.education, data.educationLevel ? [data.educationLevel] : [])
    )
  );
  b.push(
    b.bodyText("Thu nhập bình quân 6 tháng gần nhất:", {
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
  b.push(b.bodyText("Công chức/viên chức:", { bold: true, after: 40 }));
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
    b.push(b.bodyText("Loại hình:", { after: 40 }));
    b.push(
      b.inlineChecks(
        labelsOf(opt.civilServantType),
        labelsFor(opt.civilServantType, data.civilServantType)
      )
    );
  }
  b.push(
    b.field("Chủ tài khoản ngân hàng (trùng tên CCCD)", data.accountHolderName)
  );
  b.push(
    b.twoField(
      "Số tài khoản (không phải số thẻ ATM)",
      data.bankAccountNumber,
      "Ngân hàng",
      data.bankName
    )
  );
  b.push(b.field("Chi nhánh", data.branch));
  b.push(b.bodyText("Địa chỉ thường trú:", { bold: true, after: 40 }));
  b.push(b.field("Tỉnh/Thành phố", data.permanentProvince));
  b.push(b.field("Phường/Xã", data.permanentWard));
  b.push(b.field("Số nhà, tên đường", data.permanentStreetAddress));
  b.push(b.bodyText("Địa chỉ liên lạc (nếu khác):", { bold: true, after: 40 }));
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
    b.push(b.field("Tỉnh/Thành phố", data.temporaryProvince));
    b.push(b.field("Phường/Xã", data.temporaryWard));
    b.push(b.field("Số nhà, tên đường", data.temporaryStreetAddress));
  }
  b.push(b.field(s1.managerLabel.replace(" *", ""), data.managerName));
  if (data.secondManagerName) {
    b.push(b.field(s1.secondManagerLabel, data.secondManagerName));
  }

  // ===== SECTION 2: THÔNG TIN TUYỂN DỤNG =====
  b.pageBreak();
  b.push(b.sectionHeading("2. " + s2.title.toUpperCase()));
  b.push(b.bodyText("Kênh:", { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      labelsOf(opt.channel),
      labelsFor(opt.channel, data.channel ? [data.channel] : [])
    )
  );
  if (data.channel === "agency") {
    b.push(b.bodyText("Loại hình (nếu Agency):", { bold: true, after: 40 }));
    b.push(
      b.inlineChecks(
        labelsOf(opt.agencyType),
        labelsFor(opt.agencyType, data.agencyType ? [data.agencyType] : [])
      )
    );
  }
  b.push(b.bodyText("Vị trí ứng tuyển:", { bold: true, after: 40 }));
  const positionPrintLabels = [
    opt.position.agent,
    opt.position.unit_manager,
    opt.position.gad,
    opt.position.other,
  ];
  b.push(
    b.inlineChecks(
      positionPrintLabels,
      labelsFor(
        opt.position,
        data.positionApplied ? [data.positionApplied] : []
      )
    )
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
    b.bodyText("Chương trình tham gia (MDRT, Thu hút nhân tài ...):", {
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
  b.push(
    b.bodyText("Có phải tái tuyển dụng không?", { bold: true, after: 40 })
  );
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
  b.push(b.field("Số lượng khách hàng tiềm năng", data.potentialCustomers));

  b.push(b.subHeading(s5.title));
  b.push(b.bodyText("Có kinh nghiệm bảo hiểm:", { after: 40 }));
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

  b.push(b.subHeading(s8.title.replace(" *", "")));
  const familyRows = (
    data.familyMembers?.length ? data.familyMembers : [{}]
  ).map((m, i) => [
    String(i + 1),
    m.name || "",
    labelFor(opt.relationship, m.relationship) || "",
    m.birthYear || "",
    m.occupation || "",
  ]);
  b.push(
    b.dataTable(
      [700, 3000, 2160, 1500, 2000],
      ["STT", s8.name, s8.relationshipLabel, s8.birthYear, s8.occupation],
      familyRows
    )
  );

  b.push(b.subHeading(s7.title));
  b.push(
    b.bodyText(s7.definitionLabel + " " + s7.definitionText, {
      italics: true,
      size: 18,
      after: 80,
    })
  );
  b.push(
    b.bodyText(s7.questionLabel.replace(" *", ""), { bold: true, after: 40 })
  );
  b.push(
    b.inlineChecks(
      [s7.no, s7.yes + " (khai báo bên dưới)"],
      labelsFor(
        { no: s7.no, yes: s7.yes + " (khai báo bên dưới)" },
        data.hasPepRelationship === "yes" ? ["yes"] : ["no"]
      )
    )
  );
  if (data.hasPepRelationship === "yes") {
    b.push(b.field(s7.relationship.replace(" *", ""), data.pepRelationship));
    b.push(b.field(s7.fullName.replace(" *", ""), data.pepFullName));
    b.push(b.field(s7.position.replace(" *", ""), data.pepPosition));
    b.push(b.field(s7.organization.replace(" *", ""), data.pepOrganization));
  }

  // ===== SECTION 3: CAM KẾT CỦA ỨNG VIÊN =====
  b.push(b.sectionHeading("3. " + f.section11.title.toUpperCase()));
  b.push(
    new Paragraph({
      spacing: { after: 30, ...LINE_SPACING },
      indent: { left: 260 },
      children: b.checkRun(s11.voluntary, !!data.commitmentVoluntary),
    })
  );
  b.push(
    new Paragraph({
      spacing: { after: 30, ...LINE_SPACING },
      indent: { left: 260 },
      children: b.checkRun(s11.dataConsent, !!data.commitmentDataConsent),
    })
  );
  b.push(
    b.bodyText("Xác nhận cam kết & đồng ý PDPD:", { bold: true, after: 40 })
  );
  b.push(
    b.inlineChecks(
      [s11.no, s11.yes],
      labelsFor(
        { no: s11.no, yes: s11.yes },
        data.confirmationConsent ? [data.confirmationConsent] : []
      )
    )
  );
  b.push(b.bodyText("Hình thức xác nhận:", { bold: true, after: 40 }));
  b.push(
    b.inlineChecks(
      [s11.handwritten],
      labelsFor(
        { handwritten: s11.handwritten },
        data.confirmationMethod ? [data.confirmationMethod] : []
      )
    )
  );
  b.push(b.field("Ngày ký", data.signDate));
  b.push(b.spacer(), b.spacer());

  const sigWidth = Math.round(PAGE_W / 2);
  const sigHeaderCell = (text: string) =>
    new TableCell({
      width: { size: sigWidth, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: BLUE, color: "auto" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 55, bottom: 55, left: 105, right: 105 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: LINE_SPACING,
          children: [new TextRun({ text, bold: true, color: WHITE })],
        }),
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
            sigHeaderCell("QUẢN LÝ TRỰC TIẾP"),
          ],
        }),
        new TableRow({
          children: [
            sigBodyCell(data.fullName, data.signDate),
            sigBodyCell(undefined, undefined),
          ],
        }),
      ],
    })
  );

  // ===== PHỤ LỤC 1: BỘ CÂU HỎI KHẢO SÁT =====
  b.useSingleSpacing();
  b.pageBreak();
  b.push(
    new Paragraph({
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

  function questionChecklist(
    label: string,
    options: string[],
    selected: Set<string>
  ) {
    b.push(b.bodyText(label, { bold: true, after: 40 }));
    b.push(...b.stackedChecks(options, selected));
    b.push(b.spacer());
  }

  function questionFreeText(label: string, value?: string | null) {
    b.push(b.bodyText(label, { bold: true, after: 40 }));
    if (value) {
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
          spacing: { ...LINE_SPACING_SINGLE, after: 160 },
          children: [new TextRun({ text: value })],
        })
      );
    } else {
      b.push(b.blankLine());
      b.push(b.blankLine());
    }
    b.push(b.spacer());
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
