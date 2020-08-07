import { Arr, Fun, Optional } from '@ephox/katamari';
import { Attribute, SugarElement } from '@ephox/sugar';
import { Structs, RunOperation } from '@ephox/snooker';
import { Selections } from '../selection/Selections';
import * as TableSelection from '../api/TableSelection';
import { Ephemera } from '../api/Ephemera';
import * as SelectionTypes from '../selection/SelectionTypes';

// Return an array of the selected elements
const selection = (selections: Selections): SugarElement[] =>
  SelectionTypes.cata(selections.get(),
    Fun.constant([]),
    Fun.identity,
    Arr.pure
  );

const unmergable = (selections: Selections): Optional<SugarElement[]> => {
  const hasSpan = (elem: SugarElement<Element>) => (Attribute.has(elem, 'rowspan') && parseInt(Attribute.get(elem, 'rowspan') as string, 10) > 1) ||
    (Attribute.has(elem, 'colspan') && parseInt(Attribute.get(elem, 'colspan') as string, 10) > 1);

  const candidates = selection(selections);

  return candidates.length > 0 && Arr.forall(candidates, hasSpan) ? Optional.some(candidates) : Optional.none();
};

const mergable = (table: SugarElement<HTMLTableElement>, selections: Selections, ephemera: Ephemera): Optional<RunOperation.ExtractMergable> =>
  SelectionTypes.cata<Optional<RunOperation.ExtractMergable>>(selections.get(),
    Optional.none,
    (cells: SugarElement<Element>[]) => {
      if (cells.length === 0) {
        return Optional.none();
      }
      return TableSelection.retrieveBox(table, ephemera.firstSelectedSelector, ephemera.lastSelectedSelector).bind((bounds: Structs.Bounds) =>
        cells.length > 1 ? Optional.some({ bounds, cells }) : Optional.none<RunOperation.ExtractMergable>());
    },
    Optional.none
  );

export { mergable, unmergable, selection };

