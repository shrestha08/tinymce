import { Dragger } from '@ephox/dragster';
import { Fun, Optional } from '@ephox/katamari';
import { Bindable, Event, Events } from '@ephox/porkbun';
import { Attribute, Class, Compare, Css, DomEvent, SelectorFind, SugarBody, SugarElement } from '@ephox/sugar';
import { findClosestContentEditable, isContentEditableTrue } from '../alien/ContentEditable';
import { ResizeWire } from '../api/ResizeWire';
import * as Styles from '../style/Styles';
import * as CellUtils from '../util/CellUtils';
import { BarMutation } from './BarMutation';
import { BarPositions, ColInfo, RowInfo } from './BarPositions';
import * as Bars from './Bars';

export interface DragAdjustHeightEvent {
  readonly table: SugarElement;
  readonly delta: number;
  readonly row: number;
}

export interface DragAdjustWidthEvent {
  readonly table: SugarElement;
  readonly delta: number;
  readonly column: number;
}

export interface DragAdjustEvents {
  registry: {
    adjustHeight: Bindable<DragAdjustHeightEvent>;
    adjustWidth: Bindable<DragAdjustWidthEvent>;
    startAdjust: Bindable<{}>;
  };
  trigger: {
    adjustHeight: (table: SugarElement, delta: number, row: number) => void;
    adjustWidth: (table: SugarElement, delta: number, column: number) => void;
    startAdjust: () => void;
  };
}

const resizeBarDragging = Styles.resolve('resizer-bar-dragging');

export const BarManager = function (wire: ResizeWire, direction: BarPositions<ColInfo>, hdirection: BarPositions<RowInfo>) {
  const mutation = BarMutation();
  const resizing = Dragger.transform(mutation, {});

  let hoverTable = Optional.none<SugarElement>();

  const getResizer = function (element: SugarElement, type: string) {
    return Optional.from(Attribute.get(element, type));
  };

  /* Reposition the bar as the user drags */
  mutation.events.drag.bind(function (event) {
    getResizer(event.target, 'data-row').each(function (_dataRow) {
      const currentRow = CellUtils.getCssValue(event.target, 'top');
      Css.set(event.target, 'top', currentRow + event.yDelta + 'px');
    });

    getResizer(event.target, 'data-column').each(function (_dataCol) {
      const currentCol = CellUtils.getCssValue(event.target, 'left');
      Css.set(event.target, 'left', currentCol + event.xDelta + 'px');
    });
  });

  const getDelta = function (target: SugarElement, dir: string) {
    const newX = CellUtils.getCssValue(target, dir);
    const oldX = CellUtils.getAttrValue(target, 'data-initial-' + dir, 0);
    return newX - oldX;
  };

  /* Resize the column once the user releases the mouse */
  resizing.events.stop.bind(function () {
    mutation.get().each(function (target) {
      hoverTable.each(function (table) {
        getResizer(target, 'data-row').each(function (row) {
          const delta = getDelta(target, 'top');
          Attribute.remove(target, 'data-initial-top');
          events.trigger.adjustHeight(table, delta, parseInt(row, 10));
        });

        getResizer(target, 'data-column').each(function (column) {
          const delta = getDelta(target, 'left');
          Attribute.remove(target, 'data-initial-left');
          events.trigger.adjustWidth(table, delta, parseInt(column, 10));
        });

        Bars.refresh(wire, table, hdirection, direction);
      });
    });

  });

  const handler = function (target: SugarElement, dir: string) {
    events.trigger.startAdjust();
    mutation.assign(target);
    Attribute.set(target, 'data-initial-' + dir, CellUtils.getCssValue(target, dir));
    Class.add(target, resizeBarDragging);
    Css.set(target, 'opacity', '0.2');
    resizing.go(wire.parent());
  };

  /* mousedown on resize bar: start dragging when the bar is clicked, storing the initial position. */
  const mousedown = DomEvent.bind(wire.parent(), 'mousedown', function (event) {
    if (Bars.isRowBar(event.target)) {
      handler(event.target, 'top');
    }

    if (Bars.isColBar(event.target)) {
      handler(event.target, 'left');
    }
  });

  const isRoot = function (e: SugarElement) {
    return Compare.eq(e, wire.view());
  };

  const findClosestEditableTable = (target: SugarElement): Optional<SugarElement> => SelectorFind.closest(target, 'table', isRoot).filter((table) => findClosestContentEditable(table, isRoot).exists(isContentEditableTrue));

  /* mouseover on table: When the mouse moves within the CONTENT AREA (NOT THE TABLE), refresh the bars. */
  const mouseover = DomEvent.bind(wire.view(), 'mouseover', function (event) {
    findClosestEditableTable(event.target).fold(
      () => {
        /*
        * mouseout is not reliable within ContentEditable, so for all other mouseover events we clear bars.
        * This is fairly safe to do frequently; it's a single querySelectorAll() on the content and Arr.map on the result.
        * If we _really_ need to optimise it further, we can start caching the bar references in the wire somehow.
        */
        if (SugarBody.inBody(event.target)) {
          Bars.destroy(wire);
        }
      },
      (table) => {
        hoverTable = Optional.some(table);
        Bars.refresh(wire, table, hdirection, direction);
      }
    );
  });

  const destroy = function () {
    mousedown.unbind();
    mouseover.unbind();
    resizing.destroy();
    Bars.destroy(wire);
  };

  const refresh = function (tbl: SugarElement) {
    Bars.refresh(wire, tbl, hdirection, direction);
  };

  const events = Events.create({
    adjustHeight: Event([ 'table', 'delta', 'row' ]),
    adjustWidth: Event([ 'table', 'delta', 'column' ]),
    startAdjust: Event([])
  }) as DragAdjustEvents;

  return {
    destroy,
    refresh,
    on: resizing.on,
    off: resizing.off,
    hideBars: Fun.curry(Bars.hide, wire),
    showBars: Fun.curry(Bars.show, wire),
    events: events.registry
  };
};
