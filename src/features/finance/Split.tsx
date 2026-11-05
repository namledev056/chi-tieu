"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, ImageUp, Minus, Plus, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { formatVND } from "./money";
import { getPayee, savePayee } from "./repo";
import { BANKS, bankName, buildVietQR, parseVietQR, splitAmount, toTransferNote, type Payee } from "./vietqr";
import { CloseButton, cx } from "./ui";
import s from "./finance.module.css";

/* ---------- Đọc mã QR từ ảnh ---------- */

async function decodeQRImage(file: File): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Thử vài cỡ: ảnh chụp màn hình lớn thì thu nhỏ giúp nhận nhanh và chắc hơn.
    for (const max of [1000, 1600, 600]) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
      if (hit?.data) return hit.data;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------- Nhập tài khoản nhận tiền ---------- */

export function PayeeEditor({ payee, onDone }: { payee: Payee | null; onDone: () => void }) {
  const [bin, setBin] = useState(payee?.bin ?? "");
  const [account, setAccount] = useState(payee?.account ?? "");
  const [name, setName] = useState(payee?.name ?? "");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const banks = bin && !BANKS.some((b) => b.bin === bin) ? [...BANKS, { bin, name: bankName(bin) }] : BANKS;
  const valid = /^\d{6}$/.test(bin) && /^[0-9A-Za-z]{4,19}$/.test(account);

  const onFile = async (file: File) => {
    setReading(true);
    setMsg(null);
    const data = await decodeQRImage(file);
    const parsed = data ? parseVietQR(data) : null;
    setReading(false);
    if (!parsed) {
      setMsg({ text: "Không đọc được mã QR ngân hàng. Thử ảnh rõ hơn hoặc nhập tay bên dưới.", error: true });
      return;
    }
    setBin(parsed.bin);
    setAccount(parsed.account);
    if (parsed.name) setName(parsed.name);
    setMsg({ text: `Đã đọc: ${bankName(parsed.bin)} · ${parsed.account}. Kiểm tra lại rồi bấm Lưu.` });
  };

  return (
    <form
      className={s.payeeForm}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        await savePayee({ bin, account: account.trim(), name: name.trim().toUpperCase() });
        onDone();
      }}
    >
      <button
        type="button"
        className={cx(s.btn, s.btnGhost)}
        onClick={() => fileRef.current?.click()}
        disabled={reading}
      >
        <ImageUp aria-hidden />
        {reading ? "Đang đọc mã…" : "Tải ảnh mã QR ngân hàng"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Ảnh mã QR ngân hàng"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {msg && (
        <p className={msg.error ? s.errorText : s.note} role="status">
          {msg.text}
        </p>
      )}
      <p className={s.hint}>Mở app ngân hàng → mã QR nhận tiền → chụp màn hình, rồi tải ảnh đó lên.</p>

      <label className={s.field}>
        <span>Ngân hàng</span>
        <select className={s.input} aria-label="Ngân hàng" value={bin} onChange={(e) => setBin(e.target.value)} required>
          <option value="" disabled>
            Chọn ngân hàng
          </option>
          {banks.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className={s.field}>
        <span>Số tài khoản</span>
        <input
          className={s.input}
          aria-label="Số tài khoản"
          inputMode="numeric"
          autoComplete="off"
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/\s/g, ""))}
          maxLength={19}
          required
        />
      </label>
      <label className={s.field}>
        <span>Tên chủ tài khoản (không bắt buộc)</span>
        <input
          className={s.input}
          aria-label="Tên chủ tài khoản"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoCapitalize="characters"
          maxLength={50}
        />
      </label>
      <div className={s.actions}>
        <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={onDone}>
          Hủy
        </button>
        <button type="submit" className={cx(s.btn, s.btnSm)} disabled={!valid}>
          Lưu tài khoản
        </button>
      </div>
    </form>
  );
}

/* ---------- Ảnh để chia sẻ ---------- */

async function renderShareImage(o: { qr: string; amount: number; payee: Payee; note: string; people: number }) {
  const W = 720;
  const H = 1040;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#5f646b";
  ctx.font = `600 30px ${font}`;
  ctx.fillText(`Chia tiền · mỗi người`, W / 2, 80);
  ctx.fillStyle = "#1b1d1f";
  ctx.font = `800 72px ${font}`;
  ctx.fillText(formatVND(o.amount), W / 2, 165);

  const img = new Image();
  img.src = o.qr;
  await img.decode();
  ctx.drawImage(img, (W - 520) / 2, 210, 520, 520);

  ctx.font = `700 34px ${font}`;
  ctx.fillText(bankName(o.payee.bin), W / 2, 795);
  ctx.font = `600 34px ${font}`;
  ctx.fillText(o.payee.account, W / 2, 845);
  if (o.payee.name) {
    ctx.fillStyle = "#5f646b";
    ctx.font = `500 30px ${font}`;
    ctx.fillText(o.payee.name, W / 2, 893);
  }
  if (o.note) {
    ctx.fillStyle = "#5f646b";
    ctx.font = `500 28px ${font}`;
    ctx.fillText(`Nội dung: ${o.note}`, W / 2, 960);
  }
  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/* ---------- Sheet chia tiền ---------- */

export default function SplitSheet({
  total,
  title,
  onClose,
}: {
  total: number;
  /** Tên khoản chi, dùng làm nội dung chuyển khoản mặc định */
  title: string;
  onClose: () => void;
}) {
  const payee = useLiveQuery(getPayee);
  const [people, setPeople] = useState(2);
  const [editPayee, setEditPayee] = useState(false);
  const [note, setNote] = useState(() => toTransferNote(`Chia tien ${title}`));
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");

  const each = splitAmount(total, people);
  const payload = payee ? buildVietQR(payee, each, note) : "";

  useEffect(() => {
    if (!payload) return;
    let alive = true;
    QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width: 600 }).then((url) => alive && setQr(url));
    return () => {
      alive = false;
    };
  }, [payload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const share = async (download: boolean) => {
    if (!payee || !qr) return;
    const blob = await renderShareImage({ qr, amount: each, payee, note, people });
    const file = new File([blob], `chia-tien-${each}.png`, { type: "image/png" });
    const text = `Chia tiền ${title}: mỗi người ${formatVND(each)}. Quét mã để chuyển khoản.`;
    if (!download && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Đã lưu ảnh mã QR.");
  };

  return (
    <>
      <div className={cx(s.scrim, s.layer2)} onClick={onClose} aria-hidden />
      <div className={cx(s.sheet, s.layer2)} role="dialog" aria-modal="true" aria-label="Chia tiền">
        <div className={s.grab} />
        <div className={s.sheetTop}>
          <span className={s.sheetTitle}>Chia tiền</span>
          <CloseButton onClick={onClose} />
        </div>

        <div className={cx(s.card, s.splitCard)}>
          <div className={s.splitRow}>
            <span className={s.muted}>Tổng</span>
            <b className={s.num}>{formatVND(total)}</b>
          </div>
          <div className={s.splitRow}>
            <span className={s.muted}>Số người (gồm cả bạn)</span>
            <div className={s.stepper}>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setPeople(Math.max(2, people - 1))}
                disabled={people <= 2}
                aria-label="Bớt một người"
              >
                <Minus aria-hidden />
              </button>
              <output aria-live="polite" aria-label="Số người">
                {people}
              </output>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setPeople(Math.min(50, people + 1))}
                aria-label="Thêm một người"
              >
                <Plus aria-hidden />
              </button>
            </div>
          </div>
          <div className={cx(s.splitRow, s.splitEach)}>
            <span>Mỗi người</span>
            <b className={s.num} data-testid="split-each">
              {formatVND(each)}
            </b>
          </div>
          <p className={s.hint}>
            {`Thu từ ${people - 1} người · làm tròn lên 1.000 ₫`}
          </p>
        </div>

        {payee === undefined ? null : !payee || editPayee ? (
          <section className={s.card}>
            <h2 className={s.secTitle}>Tài khoản nhận tiền của bạn</h2>
            <p className={cx(s.note, s.mbSm)}>Chỉ lưu trên máy này, dùng để tạo mã QR có sẵn số tiền.</p>
            <PayeeEditor payee={payee} onDone={() => setEditPayee(false)} />
          </section>
        ) : (
          <>
            <section className={cx(s.card, s.qrCard)}>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`Mã QR chuyển ${formatVND(each)}`} className={s.qrImg} data-payload={payload} />
              ) : (
                <div className={cx(s.qrImg, s.sk)} />
              )}
              <div className={s.qrBank}>
                <b>{bankName(payee.bin)}</b>
                <span className={s.num}>{payee.account}</span>
                {payee.name && <span className={s.muted}>{payee.name}</span>}
              </div>
              <button type="button" className={s.link} onClick={() => setEditPayee(true)}>
                Đổi tài khoản
              </button>
            </section>

            <label className={s.field}>
              <span>Nội dung chuyển khoản</span>
              <input
                className={s.input}
                aria-label="Nội dung chuyển khoản"
                value={note}
                maxLength={25}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => setNote(toTransferNote(note))}
              />
            </label>

            <div className={s.saveRow}>
              <button type="button" className={cx(s.btn, s.btnGhost, s.btnAuto)} onClick={() => share(true)} disabled={!qr}>
                <Download aria-hidden />
                Lưu ảnh
              </button>
              <button type="button" className={s.btn} onClick={() => share(false)} disabled={!qr}>
                <Share2 aria-hidden />
                Chia sẻ mã QR
              </button>
            </div>
            {status && (
              <p className={cx(s.note, s.mt)} role="status">
                {status}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
