import { CommentsState } from "ui/state/comments";
import { CommentsAction } from "ui/actions/comments";
import { UIState } from "ui/state";

function initialCommentsState(): CommentsState {
  return {
    hoveredComment: null,
    pendingComments: {},
  };
}

export default function update(
  state = initialCommentsState(),
  action: CommentsAction
): CommentsState {
  switch (action.type) {
    case "add_pending_comment": {
      return {
        ...state,
        pendingComments: {
          ...state.pendingComments,
          [action.comment.comment.id]: action.comment,
        },
      };
    }

    case "set_hovered_comment": {
      return {
        ...state,
        hoveredComment: action.comment,
      };
    }

    case "update_pending_comment": {
      return {
        ...state,
        pendingComments: {
          ...state.pendingComments,
          [action.comment.comment.id]: {
            ...state.pendingComments[action.comment.comment.id],
            ...action.comment,
          },
        },
      };
    }

    case "remove_pending_comment": {
      const newState = {
        ...state,
      };
      delete newState.pendingComments[action.id];
    }

    default: {
      return state;
    }
  }
}

export const getPendingComments = (state: UIState) => state.comments.pendingComments;
export const getHoveredComment = (state: UIState) => state.comments.hoveredComment;
