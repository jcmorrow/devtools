import React from "react";
import { connect, ConnectedProps } from "react-redux";

import hooks from "ui/hooks";
import CommentMarker from "./CommentMarker";
import { selectors } from "../../reducers";
import sortBy from "lodash/sortBy";

import { UIState } from "ui/state";
import { Comment, PendingComment } from "ui/state/comments";

function Comments({ pendingComment, hoveredItem }: PropsFromRedux) {
  const recordingId = hooks.useGetRecordingId();
  const { comments: hasuraComments, loading, error } = hooks.useGetComments(recordingId);

  // Don't render anything if the comments are loading. For now, we fail silently
  // if there happens to be an error while fetching the comments. In the future, we
  // should do something to alert the user that the query has failed and provide next
  // steps for fixing that by refetching/refreshing.
  if (loading || error) {
    return null;
  }

  const comments: (Comment | PendingComment["comment"])[] = [...hasuraComments];

  const sortedComments = sortBy(comments, comment => comment.time);

  return (
    <div className="comments-container">
      {sortedComments.map((comment, index) => {
        const isPrimaryHighlighted = hoveredItem?.point === comment.point;
        return (
          <CommentMarker
            key={index}
            comment={comment}
            comments={sortedComments}
            isPrimaryHighlighted={isPrimaryHighlighted}
          />
        );
      })}
    </div>
  );
}

const connector = connect((state: UIState) => ({
  playback: selectors.getPlayback(state),
  pendingComment: selectors.getPendingComments(state),
  hoveredItem: selectors.getHoveredItem(state),
}));
type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(Comments);
