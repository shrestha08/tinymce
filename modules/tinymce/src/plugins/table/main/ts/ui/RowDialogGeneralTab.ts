/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Optional } from '@ephox/katamari';
import Editor from 'tinymce/core/api/Editor';
import { Dialog } from 'tinymce/core/api/ui/Ui';
import { getRowClassList } from '../api/Settings';
import * as Helpers from './Helpers';

const getClassList = (editor: Editor): Optional<Dialog.SelectBoxSpec> => {
  const classes = Helpers.buildListItems(getRowClassList(editor));
  if (classes.length > 0) {
    return Optional.some({
      name: 'class',
      type: 'selectbox',
      label: 'Class',
      items: classes
    });
  }
  return Optional.none();
};

const formChildren: Dialog.BodyComponentSpec[] = [
  {
    type: 'selectbox',
    name: 'type',
    label: 'Row type',
    items: [
      { text: 'Header', value: 'header' },
      { text: 'Body', value: 'body' },
      { text: 'Footer', value: 'footer' }
    ]
  },
  {
    type: 'selectbox',
    name: 'align',
    label: 'Alignment',
    items: [
      { text: 'None', value: '' },
      { text: 'Left', value: 'left' },
      { text: 'Center', value: 'center' },
      { text: 'Right', value: 'right' }
    ]
  },
  {
    label: 'Height',
    name: 'height',
    type: 'input'
  }
];

const getItems = (editor: Editor) => formChildren.concat(getClassList(editor).toArray());

export {
  getItems
};
