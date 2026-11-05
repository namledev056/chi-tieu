/**
 * VietQR (chuẩn EMVCo của NAPAS): tạo và đọc mã QR chuyển khoản ngân hàng.
 * Chạy hoàn toàn trên máy, không gọi dịch vụ ngoài.
 */

export interface Payee {
  /** Mã BIN ngân hàng 6 số, vd 970436 */
  bin: string;
  account: string;
  /** Tên chủ tài khoản (chỉ để hiển thị trên ảnh chia sẻ) */
  name: string;
}

/** Ngân hàng phổ biến: tên ngắn + BIN theo danh sách NAPAS. */
export const BANKS: { bin: string; name: string }[] = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970448", name: "OCB" },
  { bin: "970426", name: "MSB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970425", name: "ABBANK" },
  { bin: "970454", name: "Bản Việt (Timo)" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970452", name: "KienlongBank" },
  { bin: "546034", name: "CAKE" },
];

export const bankName = (bin: string) => BANKS.find((b) => b.bin === bin)?.name ?? `Ngân hàng ${bin}`;

const NAPAS_GUID = "A000000727";

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), như EMVCo yêu cầu. */
export function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Bỏ dấu tiếng Việt, chỉ giữ chữ/số/khoảng trắng — nhiều ngân hàng từ chối nội dung có dấu. */
export function toTransferNote(text: string, max = 25) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

export function buildVietQR(payee: Payee, amount?: number, note?: string) {
  const beneficiary = tlv("00", payee.bin) + tlv("01", payee.account);
  const merchant = tlv("00", NAPAS_GUID) + tlv("01", beneficiary) + tlv("02", "QRIBFTTA");
  const info = note ? toTransferNote(note) : "";
  let body =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tlv("38", merchant) +
    tlv("53", "704") +
    (amount ? tlv("54", String(Math.round(amount))) : "") +
    tlv("58", "VN") +
    (info ? tlv("62", tlv("08", info)) : "");
  body += "6304";
  return body + crc16(body);
}

function readTLV(data: string) {
  const out = new Map<string, string>();
  let i = 0;
  while (i + 4 <= data.length) {
    const id = data.slice(i, i + 2);
    const len = Number(data.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || i + 4 + len > data.length) return null;
    out.set(id, data.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return i === data.length ? out : null;
}

/** Đọc mã QR ngân hàng (VietQR) → BIN + số tài khoản. Trả null nếu không phải VietQR. */
export function parseVietQR(data: string): Omit<Payee, "name"> & { name?: string } | null {
  const text = data.trim();
  const top = readTLV(text);
  if (!top) return null;
  const crc = top.get("63");
  if (crc && crc16(text.slice(0, -4)) !== crc.toUpperCase()) return null;
  const merchant = readTLV(top.get("38") ?? "");
  if (!merchant || merchant.get("00") !== NAPAS_GUID) return null;
  const beneficiary = readTLV(merchant.get("01") ?? "");
  const bin = beneficiary?.get("00");
  const account = beneficiary?.get("01");
  if (!bin || !account) return null;
  return { bin, account, name: top.get("59") };
}

/** Chia đều, làm tròn lên tới 1.000 ₫ để dễ chuyển khoản. */
export function splitAmount(total: number, people: number) {
  const exact = total / people;
  return exact >= 1000 ? Math.ceil(exact / 1000) * 1000 : Math.ceil(exact);
}
