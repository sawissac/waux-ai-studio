"use client";

import { RotateCcw, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPEARANCE_ICON,
  LANGUAGE_ICON,
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  TOGGLE_SETTINGS,
} from "@/constants/settings";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

import { SettingToggle } from "./components/SettingToggle";

/**
 * Settings entry point — a gear icon button that opens the settings dialog.
 *
 * The dialog renders every **available setting** straight from the catalog in
 * `@/constants/settings` (theme + language choice settings and the toggle
 * settings). All reads/writes flow through {@link useAppConfig}; persistence
 * and theme application are handled by `AppConfigProvider`.
 */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const config = useAppConfig();
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Open settings"
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <SettingsIcon className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4" /> {t("settings.title")}
          </DialogTitle>
          <DialogDescription>{t("settings.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Appearance — theme */}
          <ChoiceRow
            icon={APPEARANCE_ICON}
            label={t("settings.theme")}
            description={t("settings.theme.desc")}
          >
            <Select
              value={config.theme}
              onValueChange={(v) =>
                config.setTheme(v as (typeof THEME_OPTIONS)[number]["value"])
              }
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.icon && <opt.icon className="size-4" />}
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChoiceRow>

          {/* Language — locale */}
          <ChoiceRow
            icon={LANGUAGE_ICON}
            label={t("settings.language")}
            description={t("settings.language.desc")}
          >
            <Select
              value={config.locale}
              onValueChange={(v) =>
                config.setLocale(v as (typeof LOCALE_OPTIONS)[number]["value"])
              }
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChoiceRow>

          <div className="border-t-2 border-dashed border-border" />

          {/* Behaviour — toggles */}
          {TOGGLE_SETTINGS.map((setting) => (
            <ChoiceRow
              key={setting.key}
              icon={setting.icon}
              label={t(setting.labelKey)}
              description={t(setting.descKey)}
            >
              <SettingToggle
                label={t(setting.labelKey)}
                checked={config.toggles[setting.key]}
                onChange={(next) => config.setToggle(setting.key, next)}
              />
            </ChoiceRow>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          {/* Legal — links to the public Privacy / Terms pages (open in a new
              tab so the user doesn't lose their workspace). Labels localize;
              the destination pages are English-only. */}
          <nav
            aria-label={t("settings.legal")}
            className="flex items-center gap-3 text-xs text-muted-foreground"
          >
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("settings.privacy")}
            </Link>
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("settings.terms")}
            </Link>
          </nav>
          <Button
            variant="outline"
            size="sm"
            onClick={config.resetConfig}
            className="h-7 gap-1.5 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" /> {t("settings.reset")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One labelled settings row: leading icon + label/description on the left,
 * the control (select or toggle) pinned right.
 */
function ChoiceRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof SettingsIcon;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-3")}>
      <span className="grid size-8 shrink-0 place-items-center border-2 border-foreground bg-card shadow-nb-sm">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
