import Immutable from "immutable";
import React from "react";

import { ContentRef } from "@nteract/core";
import { Media, KernelOutputError, StreamText } from "@nteract/outputs";
import { Source } from "@nteract/presentational-components";
import CodeMirrorEditor from "@nteract/editor";

import Editor from "../inputs/editor";
import Prompt from "../inputs/prompt";
import TransformMedia from "../outputs/transform-media";
import Outputs from "../outputs";
import Pagers from "../outputs/pagers";
import InputPrompts from "../outputs/input-prompts";
import Input from "../inputs/input";

import childWithDisplayName from "../pickers/display-name";

interface ComponentProps {
  id: string;
  contentRef: ContentRef;
  cell: Immutable.Map<string, any>;
  cell_type: "code";
  children?: React.ReactNode;
}

const PromptText = (props: any) => {
  if (props.status === "busy") {
    return <React.Fragment>{"[*]"}</React.Fragment>;
  }
  if (props.status === "queued") {
    return <React.Fragment>{"[…]"}</React.Fragment>;
  }
  if (typeof props.executionCount === "number") {
    return <React.Fragment>{`[${props.executionCount}]`}</React.Fragment>;
  }
  return <React.Fragment>{"[ ]"}</React.Fragment>;
};

export default class CodeCell extends React.Component<ComponentProps> {
  static defaultProps = {
    cell_type: "code"
  };

  render() {
    const { id, contentRef, children } = this.props;

    /**
     * Consumers of this React component can override specific subcomponents
     * without having to override the entire component.
     */
    const OutputsOverride = childWithDisplayName(children, "Outputs");
    const PromptOverride = childWithDisplayName(children, "Prompt");
    const PagersOverride = childWithDisplayName(children, "Pagers");
    const EditorOverride = childWithDisplayName(children, "Editor");
    const InputPromptsOverride = childWithDisplayName(children, "InputPrompts");

    return (
      <div>
        <Input id={id} contentRef={contentRef} className="nteract-cell-input">
          {PromptOverride ? (
            <PromptOverride
              id={id}
              contentRef={contentRef}
              className="nteract-cell-prompt"
            />
          ) : (
            <Prompt id={id} contentRef={contentRef}>
              <PromptText />
            </Prompt>
          )}
          <Source className="nteract-cell-source">
            <Editor
              id={id}
              contentRef={contentRef}
              className="nteract-cell-editor"
            >
              {EditorOverride ? <EditorOverride /> : <CodeMirrorEditor />}
            </Editor>
          </Source>
        </Input>
        {PagersOverride ? (
          <PagersOverride
            id={id}
            contentRef={contentRef}
            className="nteract-cell-pagers"
          />
        ) : (
          <Pagers
            id={id}
            contentRef={contentRef}
            className="nteract-cell-pagers"
          >
            <Media.Json />
            <Media.JavaScript />
            <Media.HTML />
            <Media.Markdown />
            <Media.LaTeX />
            <Media.SVG />
            <Media.Image />
            <Media.Plain />
          </Pagers>
        )}
        {OutputsOverride ? (
          <OutputsOverride
            id={id}
            contentRef={contentRef}
            className="nteract-cell-outputs"
          />
        ) : (
          <Outputs
            id={id}
            contentRef={contentRef}
            className="nteract-cell-outputs"
          >
            <TransformMedia
              output_type={"display_data"}
              id={id}
              contentRef={contentRef}
            />
            <TransformMedia
              output_type={"execute_result"}
              id={id}
              contentRef={contentRef}
            />
            <KernelOutputError />
            <StreamText />
          </Outputs>
        )}
        {InputPromptsOverride ? (
          <InputPromptsOverride
            id={id}
            contentRef={contentRef}
            className="nteract-cell-input-prompts"
          />
        ) : (
          <InputPrompts
            id={id}
            contentRef={contentRef}
            className="nteract-cell-input-prompts"
          />
        )}
      </div>
    );
  }
}