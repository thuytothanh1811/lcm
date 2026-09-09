import { IconCheck } from "@tabler/icons-react";

const CHECKLIST_ROWS: {
  stt: number;
  label: string;
  lpUm: boolean;
  mdrt: boolean;
  gad: boolean;
}[] = [
  {
    stt: 1,
    label: "Phiếu thông tin tuyển dụng (CT-01)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 2,
    label: "Phiếu cam kết & đăng ký chữ ký mẫu (CT-02)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 3,
    label: "Phiếu đánh giá ứng viên / phê duyệt (CT-03, CT04)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 4,
    label: "Chứng chỉ đại lý cơ bản (Hình chụp)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 5,
    label: "1 ảnh 4x6 chụp thẳng (không quá 6 tháng, nền xanh/trắng)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 6,
    label: "CCCD (Hình chụp 2 mặt, hình chụp quét mã QR trên CCCD)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 7,
    label: "Bằng cấp (Hình chụp)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 8,
    label: "Xác nhận số điện thoại chính chủ (hình chụp) (*)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 9,
    label: "Xác nhận Mã số thuế (hình chụp) (*)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 10,
    label: "Mã QR tài khoản ngân hàng (hình chụp)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 11,
    label:
      "Tỷ lệ duy trì hợp đồng trong vòng 06 tháng gần nhất ở công ty trước",
    lpUm: false,
    mdrt: true,
    gad: true,
  },
  {
    stt: 12,
    label: "Giấy chứng nhận MDRT của hiệp hội",
    lpUm: false,
    mdrt: true,
    gad: false,
  },
  {
    stt: 13,
    label:
      "Hồ sơ thành tích (Chứng từ thu nhập/doanh số qua trang web/app portal của công ty)",
    lpUm: false,
    mdrt: true,
    gad: true,
  },
];

function ChecklistCell({ applicable }: { applicable: boolean }) {
  return (
    <td className="border-border px-3 py-2 text-center align-middle">
      {applicable ? (
        <span
          aria-hidden
          className="border-primary bg-primary text-primary-foreground mx-auto flex size-4 items-center justify-center rounded-[4px] border"
        >
          <IconCheck className="size-3.5" />
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}

// Shared with the reviewer's document tab, which needs the table on its own
// without the public page's heading and footnotes.
export function DocumentChecklistTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="border-border w-12 border px-3 py-2 text-center">
              STT
            </th>
            <th className="border-border border px-3 py-2 text-left">
              Hồ sơ / Tài liệu
            </th>
            <th className="border-border w-20 border px-3 py-2 text-center">
              LP/UM
            </th>
            <th className="border-border w-20 border px-3 py-2 text-center">
              MDRT
            </th>
            <th className="border-border w-20 border px-3 py-2 text-center">
              GAD
            </th>
          </tr>
        </thead>
        <tbody>
          {CHECKLIST_ROWS.map(row => (
            <tr key={row.stt} className="border-border border">
              <td className="border-border border px-3 py-2 text-center">
                {row.stt}
              </td>
              <td className="border-border border px-3 py-2">{row.label}</td>
              <ChecklistCell applicable={row.lpUm} />
              <ChecklistCell applicable={row.mdrt} />
              <ChecklistCell applicable={row.gad} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecruitmentDocumentChecklist() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <h2 className="text-xl font-semibold">DANH MỤC HỒ SƠ</h2>
      </div>

      <DocumentChecklistTable />

      <div className="mt-6 space-y-1 text-sm">
        <p className="font-semibold">Lưu ý:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">
              Xác nhận số điện thoại chính chủ:
            </span>{" "}
            Soạn tin nhắn điện thoại với cú pháp: [TTTB] [Số CCCD/CMND] gửi 1414
            HOẶC hình chụp từ VNEID
          </li>
          <li>
            <span className="font-medium">Xác nhận Mã số thuế:</span> Hình chụp
            từ eTax mobile
          </li>
        </ul>
      </div>
    </div>
  );
}
