import { useMemo } from 'react';
import { SelectField } from '../ui/select-field.jsx';
import { FormField } from '../ui/form-field.jsx';
import {
  getLevel1Options,
  getLevel2Options,
  getLevel3Options,
} from '../../data/productCategoryData.js';

export function ProductCategorySelect({ value, onChange, error }) {
  const level1Options = useMemo(() => getLevel1Options(), []);
  const level2Options = useMemo(() => getLevel2Options(value.level1), [value.level1]);
  const level3Options = useMemo(() => getLevel3Options(value.level2), [value.level2]);

  function updateLevel1(next) {
    onChange({ level1: next, level2: '', level3: '' });
  }

  function updateLevel2(next) {
    onChange({ ...value, level2: next, level3: '' });
  }

  function updateLevel3(next) {
    onChange({ ...value, level3: next });
  }

  return (
    <>
      <FormField label="一级分类" fieldKey="categoryLevel1">
        <SelectField
          value={value.level1 || ''}
          onValueChange={updateLevel1}
          options={level1Options}
          placeholder="请选择一级分类"
          ariaLabel="一级分类"
        />
      </FormField>
      <FormField label="二级分类" fieldKey="categoryLevel2">
        <SelectField
          value={value.level2 || ''}
          onValueChange={updateLevel2}
          options={level2Options}
          placeholder="请选择二级分类"
          ariaLabel="二级分类"
          disabled={!value.level1}
        />
      </FormField>
      <FormField label="三级分类 *" fieldKey="categoryLevel3" error={error}>
        <SelectField
          value={value.level3 || ''}
          onValueChange={updateLevel3}
          options={level3Options}
          placeholder="请选择三级分类"
          ariaLabel="三级分类"
          disabled={!value.level2}
          invalid={Boolean(error)}
        />
      </FormField>
    </>
  );
}
