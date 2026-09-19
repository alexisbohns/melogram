"use client";

import { Pause, Play } from "lucide-react";
import { useRender } from "@base-ui/react/use-render";
import { mergeProps } from "@base-ui/react/merge-props";
import styles from "./PlayButton.module.css";

type State = {
  playing: boolean;
};

type Props = useRender.ComponentProps<"button", State> & {
  /** Whether the track is currently playing (as opposed to paused). */
  playing: boolean;
  /**
   * The full accessible name, e.g. "Play Song Title" / "Pause Song Title".
   * Callers keep control of the exact wording.
   */
  label: string;
  /** Icon size in pixels. Call sites differ, so this has no house default. */
  size?: number;
};

/**
 * The app's canonical 40px play/pause control, shared by every place a
 * track plays (`StandaloneTrack`, `AlbumTrack`, `TrackHero`).
 *
 * This is a single button whose ACCESSIBLE NAME flips between "Play …" and
 * "Pause …" — intentionally not `aria-pressed` and not Base UI's `Toggle`,
 * since a screen reader would announce "Play, pressed" for a media
 * transport control, which is wrong. The `playing` state is surfaced as the
 * `data-playing` attribute (via useRender's state-to-data-* mapping) so the
 * "filled" visual state is styled in CSS rather than toggled by a class the
 * caller has to remember to pass.
 */
export default function PlayButton(props: Props) {
  const { render, playing, label, size = 24, ...otherProps } = props;

  const state: State = { playing };

  const element = useRender({
    defaultTagName: "button",
    render,
    state,
    props: mergeProps<"button">(
      {
        type: "button",
        className: styles.play,
        "aria-label": label,
        children: playing ? (
          <Pause size={size} strokeWidth={2} />
        ) : (
          <Play size={size} strokeWidth={2} />
        ),
      },
      otherProps
    ),
  });

  return element;
}
