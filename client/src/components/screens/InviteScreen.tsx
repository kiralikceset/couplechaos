/**
 * Opened from an invite link: shows who is inviting, asks for a name, joins.
 * Works for brand-new players too (no onboarding in the way).
 */
import { useEffect, useState } from "react";
import { isPremiumUser } from "@/lib/premium";
import socket from "@/lib/socket";
import { useLocale } from "@/contexts/LocaleContext";
import { getProfile, saveProfile } from "@/lib/gameData";
import { getLocale } from "@/lib/i18n";
import { playTap } from "@/lib/sounds";
import { toast } from "sonner";

interface Props {
  code: string;
  onCancel: () => void;
}

interface RoomInfo {
  open: boolean;
  mode?: "classic" | "co-draw";
  hostName?: string;
  hostAvatar?: string;
}

const AVATARS = ["😎", "🦊", "🐱", "🦄", "🔥", "🌸", "🐼", "👾"];

export default function InviteScreen({ code, onCancel }: Props) {
  const { t } = useLocale();
  const profile = getProfile();
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [name, setName] = useState(profile.username || "");
  const [avatar, setAvatar] = useState(profile.avatar || "😎");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const base = socket.baseUrl;
    if (!base) {
      setInfo({ open: false });
      return;
    }
    const controller = new AbortController();
    fetch(`${base}/api/room/${code}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: RoomInfo) => setInfo(data))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setInfo({ open: false });
      });
    return () => controller.abort();
  }, [code]);

  useEffect(() => {
    const onError = (data: { message?: string }) => {
      setJoining(false);
      toast.error(data?.message || t("invite.closed"));
    };
    socket.on("join_error", onError);
    return () => { socket.off("join_error", onError); };
  }, [t]);

  function join() {
    const username = name.trim();
    if (!username || joining) return;
    playTap();
    setJoining(true);
    saveProfile({ ...getProfile(), username, avatar });
    try {
      // Someone who arrives through a link has seen enough intro: skip it next time.
      localStorage.setItem("cc_onboarded", "true");
      localStorage.setItem("cc_how_seen", "true");
      if (!localStorage.getItem("cc_logged_in")) localStorage.setItem("cc_logged_in", "guest");
    } catch {
      /* continue in memory */
    }
    socket.emit("join_room", { code, username, avatar, locale: getLocale(), premium: isPremiumUser() });
  }

  const mode = info?.mode === "co-draw" ? t("home.coDraw") : t("home.classic");

  return (
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-12">
        {info === null ? (
          <div className="h-40 rounded-[28px] bg-[#17141D] animate-pulse" />
        ) : info.open ? (
          <>
            <div className="flex items-center gap-3">
              <span className="size-20 rounded-[24px] bg-[#FF1A6C] flex items-center justify-center text-5xl">{info.hostAvatar || "😎"}</span>
              <span className="text-3xl" aria-hidden>✏️</span>
              <span className="size-20 rounded-[24px] bg-[#17141D] border-2 border-dashed border-[#2A2533] flex items-center justify-center text-5xl">{avatar}</span>
            </div>
            <h1 className="mt-7 font-display text-[2rem] leading-[1.05] font-bold tracking-[-0.02em]">
              {t("invite.title").replace("{name}", info.hostName || t("invite.someone"))}
            </h1>
            <p className="mt-2 text-[#B9B3C7] text-base">{t("invite.lead").replace("{mode}", mode)}</p>

            <label className="mt-8 block text-sm font-semibold text-[#B9B3C7]" htmlFor="invite-name">{t("invite.yourName")}</label>
            <input
              id="invite-name"
              value={name}
              maxLength={20}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") join(); }}
              placeholder={t("profile.usernamePlaceholder")}
              className="mt-2 w-full h-14 px-4 rounded-2xl bg-[#17141D] border border-[#2A2533] text-white text-base focus:outline-none focus:border-[#F7F3FF]/50"
            />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {AVATARS.map((item) => (
                <button
                  key={item}
                  onClick={() => { playTap(); setAvatar(item); }}
                  aria-pressed={avatar === item}
                  className={`size-11 flex-shrink-0 rounded-xl text-2xl flex items-center justify-center ${avatar === item ? "bg-[#F7F3FF]" : "bg-[#17141D]"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center">
            <span className="text-5xl">🫥</span>
            <h1 className="mt-4 font-display text-2xl font-bold">{t("invite.closed")}</h1>
            <p className="mt-2 text-[#B9B3C7] text-sm">{t("invite.closedLead")}</p>
          </div>
        )}
      </main>

      <footer className="relative z-10 px-6 pb-10 pt-6 space-y-2">
        {info?.open && (
          <button
            onClick={join}
            disabled={!name.trim() || joining}
            className="cc-press w-full h-14 rounded-2xl bg-[#F7F3FF] text-[#07060A] font-bold text-base disabled:opacity-40"
          >
            {joining ? "…" : t("invite.join")}
          </button>
        )}
        <button onClick={() => { playTap(); onCancel(); }} className="w-full py-3 text-[#B9B3C7] text-sm font-semibold">
          {info && !info.open ? t("invite.home") : t("common.cancel")}
        </button>
      </footer>
    </div>
  );
}
