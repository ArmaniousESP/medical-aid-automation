'use client';

import { useState } from 'react';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';

/**
 * Works inside native <form method="get|post"> by keeping a hidden input
 * in sync with the searchable picker value.
 */
export function FormSelectPicker({
  name,
  defaultValue = '',
  options,
  allowCreate = false,
  placeholder = 'Select…',
  className = '',
}: {
  name: string;
  defaultValue?: string;
  options: PickerOption[];
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className={className}>
      <input type="hidden" name={name} value={value} />
      <SearchablePicker
        value={value}
        onChange={setValue}
        options={options}
        allowCreate={allowCreate}
        placeholder={placeholder}
      />
    </div>
  );
}
