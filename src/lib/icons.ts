import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
	faPlay,
	faPause,
	faHouse,
	faArrowLeft,
	faComment,
	faHeart as fasHeart,
	faThumbsUp as fasThumbsUp,
	faSquareMinus as fasSquareMinus,
	faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons';

import {
	faHeart as farHeart,
	faThumbsUp as farThumbsUp,
	faSquareMinus as farSquareMinus
} from '@fortawesome/free-regular-svg-icons';

export type { IconDefinition };

export const icons = {
	play: faPlay as IconDefinition,
	pause: faPause as IconDefinition,
	home: faHouse as IconDefinition,
	arrowLeft: faArrowLeft as IconDefinition,
	comment: faComment as IconDefinition,
	heart: fasHeart as IconDefinition,
	heartRegular: farHeart as IconDefinition,
	thumbsUp: fasThumbsUp as IconDefinition,
	thumbsUpRegular: farThumbsUp as IconDefinition,
	squareMinus: fasSquareMinus as IconDefinition,
	squareMinusRegular: farSquareMinus as IconDefinition,
	clockRotateLeft: faClockRotateLeft as IconDefinition
};
