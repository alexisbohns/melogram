import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faPlay,
  faPause,
  faHouse,
  faArrowLeft,
  faComment,
  faHeart
} from '@fortawesome/free-solid-svg-icons'

export type { IconDefinition }

export const icons = {
  play: faPlay as IconDefinition,
  pause: faPause as IconDefinition,
  home: faHouse as IconDefinition,
  arrowLeft: faArrowLeft as IconDefinition,
  comment: faComment as IconDefinition,
  heart: faHeart as IconDefinition
}

