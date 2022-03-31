import { Action } from "redux";
import { selectors } from "ui/reducers";
import { actions } from "ui/actions";
import { PendingComment, Comment, Reply, SourceLocation, CommentOptions } from "ui/state/comments";
import { UIThunkAction } from ".";
import { ThreadFront } from "protocol/thread";
import escapeHtml from "escape-html";
import { waitForTime } from "protocol/utils";
import { RecordingId } from "@recordreplay/protocol";
import { User } from "ui/types";
import { setSelectedPrimaryPanel } from "./layout";
import { getCurrentTime, getFocusRegion } from "ui/reducers/timeline";
import { getExecutionPoint } from "devtools/client/debugger/src/reducers/pause";
import { RequestSummary } from "ui/components/NetworkMonitor/utils";
const { getFilenameFromURL } = require("devtools/client/debugger/src/utils/sources-tree/getURL");
const { getTextAtLocation } = require("devtools/client/debugger/src/reducers/sources");
const { findClosestFunction } = require("devtools/client/debugger/src/utils/ast");
const { getSymbols } = require("devtools/client/debugger/src/reducers/ast");
const { setSymbols } = require("devtools/client/debugger/src/actions/sources/symbols");
const {
  waitForEditor,
  getCodeMirror,
} = require("devtools/client/debugger/src/utils/editor/create-editor");

type AddPendingComment = Action<"add_pending_comment"> & { comment: PendingComment };
type UpdatePendingComment = Action<"update_pending_comment"> & { comment: PendingComment };
type RemovePendingComment = Action<"remove_pending_comment"> & { id: string };
type SetHoveredComment = Action<"set_hovered_comment"> & { comment: any };

export type CommentsAction =
  | AddPendingComment
  | UpdatePendingComment
  | SetHoveredComment
  | RemovePendingComment;

export function addPendingComment(comment: PendingComment): AddPendingComment {
  return { type: "add_pending_comment", comment };
}

export function updatePendingComment(comment: any): UpdatePendingComment {
  return { type: "update_pending_comment", comment };
}

export function setHoveredComment(comment: any): SetHoveredComment {
  return { type: "set_hovered_comment", comment };
}

export function removePendingComment(comment: { id: string }): RemovePendingComment {
  return { type: "remove_pending_comment", id: comment.id };
}

export function createComment(
  time: number,
  point: string,
  user: User,
  recordingId: RecordingId,
  options: CommentOptions
): UIThunkAction {
  return async dispatch => {
    const { sourceLocation, hasFrames, position, networkRequestId } = options;
    const labels = sourceLocation ? await dispatch(createLabels(sourceLocation)) : undefined;
    const primaryLabel = labels?.primary;
    const secondaryLabel = labels?.secondary;

    const pendingComment: PendingComment = {
      type: "new_comment",
      comment: {
        content: "",
        createdAt: new Date().toISOString(),
        hasFrames,
        id: crypto.randomUUID!(),
        networkRequestId: networkRequestId || null,
        point,
        position,
        primaryLabel,
        recordingId,
        replies: [],
        secondaryLabel,
        sourceLocation,
        time,
        updatedAt: new Date().toISOString(),
        user,
      },
    };

    dispatch(setSelectedPrimaryPanel("comments"));
    dispatch(addPendingComment(pendingComment));
  };
}

export function createFrameComment(
  time: number,
  point: string,
  position: { x: number; y: number } | null,
  user: User,
  recordingId: RecordingId,
  breakpoint?: any
): UIThunkAction {
  return async dispatch => {
    const sourceLocation =
      breakpoint?.location || (await getCurrentPauseSourceLocationWithTimeout());
    const options = {
      position,
      hasFrames: true,
      sourceLocation: sourceLocation || null,
    };
    dispatch(createComment(time, point, user, recordingId, options));
  };
}

function getCurrentPauseSourceLocationWithTimeout() {
  return Promise.race([ThreadFront.getCurrentPauseSourceLocation(), waitForTime(1000)]);
}

export function createFloatingCodeComment(
  time: number,
  point: string,
  user: User,
  recordingId: RecordingId,
  breakpoint: any
): UIThunkAction {
  return async dispatch => {
    const { location: sourceLocation } = breakpoint;
    const options = {
      position: null,
      hasFrames: false,
      sourceLocation: sourceLocation || null,
    };
    dispatch(createComment(time, point, user, recordingId, options));
  };
}

export function createNetworkRequestComment(
  request: RequestSummary,
  user: User,
  recordingId: RecordingId
): UIThunkAction {
  return async (dispatch, getState) => {
    const state = getState();
    const currentTime = getCurrentTime(state);
    const executionPoint = getExecutionPoint(state);

    const time = request.triggerPoint?.time ?? currentTime;
    const point = request.triggerPoint?.point || executionPoint!;

    const options = {
      position: null,
      hasFrames: false,
      sourceLocation: null,
      networkRequestId: request.id,
    };
    dispatch(createComment(time, point, user, recordingId, options));
  };
}

export function createLabels(sourceLocation: {
  sourceId: string;
  sourceUrl: string;
  line: number;
}): UIThunkAction<Promise<{ primary: string; secondary: string }>> {
  return async (dispatch, getState) => {
    const { sourceId, sourceUrl, line } = sourceLocation;
    const filename = getFilenameFromURL(sourceUrl);
    if (!sourceId) {
      return { primary: `${filename}:${line}`, secondary: "" };
    }
    const state = getState();

    let symbols = getSymbols(state, { id: sourceId });
    if (!symbols) {
      symbols = await dispatch(setSymbols({ source: { id: sourceId } }));
    }
    const closestFunction = findClosestFunction(symbols, sourceLocation);
    const primary = closestFunction?.name || `${filename}:${line}`;

    let snippet = getTextAtLocation(state, sourceId, sourceLocation) || "";
    if (!snippet) {
      const sourceContent = await ThreadFront.getSourceContents(sourceId);
      const lineText = sourceContent.contents.split("\n")[line - 1];
      snippet = lineText?.slice(0, 100).trim();
    }
    let secondary = "";
    if (snippet) {
      await waitForEditor();
      const CodeMirror = getCodeMirror();
      CodeMirror.runMode(snippet, "javascript", (text: string, className: string | null) => {
        const openingTag = className ? `<span class="cm-${className}">` : "<span>";
        secondary += `${openingTag}${escapeHtml(text)}</span>`;
      });
    }
    return { primary, secondary };
  };
}

export function seekToComment(item: Comment | Reply | PendingComment["comment"]): UIThunkAction {
  return (dispatch, getState) => {
    const focusRegion = getFocusRegion(getState());

    if (focusRegion && (item.time < focusRegion.startTime || item.time > focusRegion.endTime)) {
      console.error("Cannot seek outside the current focused region", focusRegion, item);
      return;
    }

    let cx = selectors.getThreadContext(getState());
    dispatch(actions.seek(item.point, item.time, item.hasFrames));
    dispatch(actions.setSelectedPrimaryPanel("comments"));
    if (item.sourceLocation) {
      cx = selectors.getThreadContext(getState());
      dispatch(actions.selectLocation(cx, item.sourceLocation));
    }
  };
}
