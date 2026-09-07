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
    label: "1 ảnh 4x6 chụp thẳng (không quá 6 tháng, nền xanh/trắng)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 5,
    label: "CCCD (Hình chụp 2 mặt, hình chụp quét mã QR trên CCCD)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 6,
    label: "Bằng cấp (Hình chụp)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 7,
    label: "Xác nhận số điện thoại chính chủ (hình chụp) (*)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 8,
    label: "Xác nhận Mã số thuế (hình chụp) (*)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 9,
    label: "Mã QR khoản ngân hàng (hình chụp)",
    lpUm: true,
    mdrt: true,
    gad: true,
  },
  {
    stt: 10,
    label:
      "Tỷ lệ duy trì hợp đồng trong vòng 06 tháng gần nhất ở công ty trước",
    lpUm: false,
    mdrt: true,
    gad: true,
  },
  {
    stt: 11,
    label: "Giấy chứng nhận MDRT của hiệp hội",
    lpUm: false,
    mdrt: true,
    gad: true,
  },
  {
    stt: 12,
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
        <span aria-hidden className="text-lg leading-none">
          ☐
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}

export function RecruitmentDocumentChecklist() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          CT-05
        </p>
        <h2 className="text-xl font-semibold">DANH MỤC HỒ SƠ</h2>
      </div>

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

      <p className="mt-4 text-sm">
        Kết luận kiểm tra:&nbsp;&nbsp;☐ Hợp lệ – chuyển Phê duyệt&nbsp;&nbsp;
        &nbsp;&nbsp;☐ Chưa hợp lệ – yêu cầu bổ sung
      </p>

      <div className="mt-6 space-y-1 text-sm">
        <p className="font-semibold">Lưu ý:</p>
        <p>
          <span className="font-medium">Xác nhận số điện thoại chính chủ:</span>{" "}
          Soạn tin nhắn điện thoại với cú pháp: [TTTB] [Số CCCD/CMND] gửi 1414
          HOẶC hình chụp từ VNEID
        </p>
        <p>
          <span className="font-medium">Xác nhận Mã số thuế:</span> Hình chụp từ
          eTax mobile
        </p>
        <p className="text-muted-foreground">
          (Quy trình xử lý online nên chỉ cần bộ phận LCM kiểm tra)
        </p>
      </div>

      <div className="mt-10 flex flex-col items-end gap-1 text-sm">
        <p className="font-semibold">Người kiểm tra (LCM)</p>
        <p className="text-muted-foreground">(ký, ghi rõ họ tên)</p>
      </div>
    </div>
  );
}
