import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
	faPlay,
	faPause,
	faHouse,
	faArrowLeft,
	faComment,
	faHeart as fasHeart,
	faClockRotateLeft,
	faForwardStep,
	faBackwardStep,
	faRepeat,
	faMicrophone,
	faXmark
} from '@fortawesome/free-solid-svg-icons';

import {
	faHeart as farHeart,
	faUserCircle as farUserCircle
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
	userCircle: farUserCircle as IconDefinition,
	clockRotateLeft: faClockRotateLeft as IconDefinition,
	forwardStep: faForwardStep as IconDefinition,
	backwardStep: faBackwardStep as IconDefinition,
	repeat: faRepeat as IconDefinition,
	microphone: faMicrophone as IconDefinition,
	xmark: faXmark as IconDefinition
};
