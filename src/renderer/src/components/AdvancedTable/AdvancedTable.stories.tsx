import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AdvancedTable, type AdvancedTableColumn, type AdvancedTableSort } from './AdvancedTable';

interface Service {
  id: string;
  name: string;
  owner: string;
  requests: number;
  children?: Service[];
}

const data: Service[] = [
  {
    id: 'api',
    name: 'api',
    owner: 'platform',
    requests: 1200,
    children: [
      { id: 'api-v1', name: 'api / v1', owner: 'platform', requests: 800 },
      { id: 'api-v2', name: 'api / v2', owner: 'platform', requests: 400 },
    ],
  },
  { id: 'auth', name: 'auth', owner: 'security', requests: 540 },
  { id: 'billing', name: 'billing', owner: 'finance', requests: 90 },
  { id: 'search', name: 'search', owner: 'discovery', requests: 2100 },
];

const columns: AdvancedTableColumn<Service>[] = [
  { key: 'name', header: 'Service', sortable: true },
  { key: 'owner', header: 'Owner', sortable: true },
  { key: 'requests', header: 'Requests', align: 'right', sortable: true },
];

const meta: Meta<typeof AdvancedTable<Service>> = {
  title: 'Components/Data/AdvancedTable',
  component: AdvancedTable,
  args: {
    columns,
    data,
    caption: 'Service traffic',
  },
  argTypes: {
    hasResizableColumns: { control: 'boolean' },
    captionHidden: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof AdvancedTable<Service>>;

export const Default: Story = {};

/** Expandable / nested rows (hierarchical data). */
export const NestedRows: Story = {
  args: { getSubRows: (row) => row.children },
};

/** Controlled single-column sort. */
export const Sortable: Story = {
  render: (args) => {
    const [sort, setSort] = useState<AdvancedTableSort | null>({
      columnKey: 'requests',
      direction: 'desc',
    });
    return <AdvancedTable {...args} sort={sort} onSortChange={setSort} />;
  },
};

/** Resizable + reorderable columns via the per-column context menu. */
export const ResizableColumns: Story = {
  args: { hasResizableColumns: true },
};

/** A constrained height makes the sticky header + Y overflow visible. */
export const StickyHeaderOverflow: Story = {
  args: {
    maxBlockSize: '10rem',
    data: [
      ...data,
      { id: 'logs', name: 'logs', owner: 'observability', requests: 5000 },
      { id: 'metrics', name: 'metrics', owner: 'observability', requests: 4200 },
      { id: 'traces', name: 'traces', owner: 'observability', requests: 1500 },
    ],
  },
};
