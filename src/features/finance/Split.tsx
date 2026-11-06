"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, ImageUp, Minus, Plus, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { formatVND } from "./money";
import { getPayee, savePayee } from "./repo";
import { BANKS, bankName, buildVietQR, parseVietQR, splitAmount, toTransferNote, type Payee } from "./vietqr";
import { CloseButton, cx } from "./ui";
import { useT, type Dict } from "./i18n";
import s from "./finance.module.css";

/* ---------- Decode a QR code from an image ---------- */

async function decodeQRImage(file: File): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Try a few sizes: downscaling large screenshots makes detection faster and more reliable.
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

/* ---------- Receiving account form ---------- */

export function PayeeEditor({ payee, onDone }: { payee: Payee | null; onDone: () => void }) {
  const t = useT();
  const [bin, setBin] = useState(payee?.bin ?? "");
  const [account, setAccount] = useState(payee?.account ?? "");
  const [name, setName] = useState(payee?.name ?? "");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const banks = bin && !BANKS.some((b) => b.bin === bin) ? [...BANKS, { bin, name: bankName(bin, t) }] : BANKS;
  const valid = /^\d{6}$/.test(bin) && /^[0-9A-Za-z]{4,19}$/.test(account);

  const onFile = async (file: File) => {
    setReading(true);
    setMsg(null);
    const data = await decodeQRImage(file);
    const parsed = data ? parseVietQR(data) : null;
    setReading(false);
    if (!parsed) {
      setMsg({ text: t.qrReadError, error: true });
      return;
    }
    setBin(parsed.bin);
    setAccount(parsed.account);
    if (parsed.name) setName(parsed.name);
    setMsg({ text: t.qrRead(bankName(parsed.bin, t), parsed.account) });
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
        {reading ? t.readingQr : t.uploadQr}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-label={t.qrImage}
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
      <p className={s.hint}>{t.qrHowTo}</p>

      <label className={s.field}>
        <span>{t.bank}</span>
        <select className={s.input} aria-label={t.bank} value={bin} onChange={(e) => setBin(e.target.value)} required>
          <option value="" disabled>
            {t.pickBank}
          </option>
          {banks.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className={s.field}>
        <span>{t.accountNumber}</span>
        <input
          className={s.input}
          aria-label={t.accountNumber}
          inputMode="numeric"
          autoComplete="off"
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/\s/g, ""))}
          maxLength={19}
          required
        />
      </label>
      <label className={s.field}>
        <span>{t.accountNameOptional}</span>
        <input
          className={s.input}
          aria-label={t.accountName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoCapitalize="characters"
          maxLength={50}
        />
      </label>
      <div className={s.actions}>
        <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={onDone}>
          {t.cancel}
        </button>
        <button type="submit" className={cx(s.btn, s.btnSm)} disabled={!valid}>
          {t.saveAccount}
        </button>
      </div>
    </form>
  );
}

/* ---------- Image for sharing ---------- */

async function renderShareImage(o: { qr: string; amount: number; payee: Payee; note: string; t: Dict }) {
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
  ctx.fillText(o.t.shareHeading, W / 2, 80);
  ctx.fillStyle = "#1b1d1f";
  ctx.font = `800 72px ${font}`;
  ctx.fillText(formatVND(o.amount), W / 2, 165);

  const img = new Image();
  img.src = o.qr;
  await img.decode();
  ctx.drawImage(img, (W - 520) / 2, 210, 520, 520);

  ctx.font = `700 34px ${font}`;
  ctx.fillText(bankName(o.payee.bin, o.t), W / 2, 795);
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
    ctx.fillText(o.t.transferNoteLine(o.note), W / 2, 960);
  }
  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/* ---------- Split-bill sheet ---------- */

export default function SplitSheet({
  total,
  title,
  onClose,
}: {
  total: number;
  /** Expense name, used as the default transfer note */
  title: string;
  onClose: () => void;
}) {
  const t = useT();
  const payee = useLiveQuery(getPayee);
  const [people, setPeople] = useState(2);
  const [editPayee, setEditPayee] = useState(false);
  const [note, setNote] = useState(() => toTransferNote(t.defaultTransferNote(title)));
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
    const blob = await renderShareImage({ qr, amount: each, payee, note, t });
    const file = new File([blob], t.shareFile(each), { type: "image/png" });
    const text = t.shareText(title, formatVND(each));
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
    setStatus(t.savedQr);
  };

  return (
    <>
      <div className={cx(s.scrim, s.layer2)} onClick={onClose} aria-hidden />
      <div className={cx(s.sheet, s.layer2)} role="dialog" aria-modal="true" aria-label={t.split}>
        <div className={s.grab} />
        <div className={s.sheetTop}>
          <span className={s.sheetTitle}>{t.split}</span>
          <CloseButton onClick={onClose} />
        </div>

        <div className={cx(s.card, s.splitCard)}>
          <div className={s.splitRow}>
            <span className={s.muted}>{t.total}</span>
            <b className={s.num}>{formatVND(total)}</b>
          </div>
          <div className={s.splitRow}>
            <span className={s.muted}>{t.people}</span>
            <div className={s.stepper}>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setPeople(Math.max(2, people - 1))}
                disabled={people <= 2}
                aria-label={t.fewer}
              >
                <Minus aria-hidden />
              </button>
              <output aria-live="polite" aria-label={t.peopleAria}>
                {people}
              </output>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setPeople(Math.min(50, people + 1))}
                aria-label={t.more}
              >
                <Plus aria-hidden />
              </button>
            </div>
          </div>
          <div className={cx(s.splitRow, s.splitEach)}>
            <span>{t.each}</span>
            <b className={s.num} data-testid="split-each">
              {formatVND(each)}
            </b>
          </div>
          <p className={s.hint}>
            {t.collectFrom(people - 1)}
          </p>
        </div>

        {payee === undefined ? null : !payee || editPayee ? (
          <section className={s.card}>
            <h2 className={s.secTitle}>{t.yourPayee}</h2>
            <p className={cx(s.note, s.mbSm)}>{t.payeeLocal}</p>
            <PayeeEditor payee={payee} onDone={() => setEditPayee(false)} />
          </section>
        ) : (
          <>
            <section className={cx(s.card, s.qrCard)}>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={t.qrAlt(formatVND(each))} className={s.qrImg} data-payload={payload} />
              ) : (
                <div className={cx(s.qrImg, s.sk)} />
              )}
              <div className={s.qrBank}>
                <b>{bankName(payee.bin, t)}</b>
                <span className={s.num}>{payee.account}</span>
                {payee.name && <span className={s.muted}>{payee.name}</span>}
              </div>
              <button type="button" className={s.link} onClick={() => setEditPayee(true)}>
                {t.changeAccount}
              </button>
            </section>

            <label className={s.field}>
              <span>{t.transferNote}</span>
              <input
                className={s.input}
                aria-label={t.transferNote}
                value={note}
                maxLength={25}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => setNote(toTransferNote(note))}
              />
            </label>

            <div className={s.saveRow}>
              <button type="button" className={cx(s.btn, s.btnGhost, s.btnAuto)} onClick={() => share(true)} disabled={!qr}>
                <Download aria-hidden />
                {t.saveImage}
              </button>
              <button type="button" className={s.btn} onClick={() => share(false)} disabled={!qr}>
                <Share2 aria-hidden />
                {t.shareQr}
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
