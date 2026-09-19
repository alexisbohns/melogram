"use client";

import { useRender } from "@base-ui/react/use-render";
import { mergeProps } from "@base-ui/react/merge-props";
import styles from "./IconButton.module.css";

type Props = useRender.ComponentProps<"button"> & {
  /** The accessible name — this button carries no visible text label. */
  label: string;
};

/**
 * The app's canonical 40px icon-only action button (currently the lyrics
 * trigger on `AlbumTrack` and `TrackHero`). Built on the same headless
 * `useRender` primitive as `PlayButton`.
 */
export default function IconButton(props: Props) {
  const { render, label, ...otherProps } = props;

  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        type: "button",
        className: styles.iconButton,
        "aria-label": label,
      },
      otherProps
    ),
  });

  return element;
}
