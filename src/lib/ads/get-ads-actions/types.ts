import type { AdStylesOverrides } from 'lib/apis/temple';

import type { AdMetadata } from '../ads-meta';

export enum AdActionType {
  ReplaceAllChildren = 'replace-all-children',
  ReplaceElement = 'replace-element',
  SimpleInsertAd = 'simple-insert-ad',
  RemoveElement = 'remove-element',
  HideElement = 'hide-element'
}

interface AdActionBase {
  type: AdActionType;
}

interface InsertAdActionProps extends AdMetadata {
  shouldUseDivWrapper: boolean;
  divWrapperStyle?: StringRecord<string>;
  elementStyle?: StringRecord<string>;
  stylesOverrides?: AdStylesOverrides[];
}

export interface ReplaceAllChildrenWithAdAction extends AdActionBase, InsertAdActionProps {
  type: AdActionType.ReplaceAllChildren;
  parent: HTMLElement;
}

export interface ReplaceElementWithAdAction extends AdActionBase, InsertAdActionProps {
  type: AdActionType.ReplaceElement;
  element: HTMLElement;
}

export interface SimpleInsertAdAction extends AdActionBase, InsertAdActionProps {
  type: AdActionType.SimpleInsertAd;
  parent: HTMLElement;
  insertionIndex: number;
}

export interface RemoveElementAction extends AdActionBase {
  type: AdActionType.RemoveElement;
  element: HTMLElement;
}

export interface HideElementAction extends AdActionBase {
  type: AdActionType.HideElement;
  element: HTMLElement;
}

export type InsertAdAction = ReplaceAllChildrenWithAdAction | ReplaceElementWithAdAction | SimpleInsertAdAction;

export type OmitAdMeta<T extends AdMetadata> = Omit<T, keyof AdMetadata>;

export type InsertAdActionWithoutMeta =
  | OmitAdMeta<ReplaceAllChildrenWithAdAction>
  | OmitAdMeta<ReplaceElementWithAdAction>
  | OmitAdMeta<SimpleInsertAdAction>;

export type AdAction = InsertAdAction | RemoveElementAction | HideElementAction;
