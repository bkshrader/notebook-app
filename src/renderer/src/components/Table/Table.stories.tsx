import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Table, type TableColumn, type TableSort } from './Table';

interface Server {
  id: string;
  name: string;
  region: string;
  status: string;
  cpu: number;
}

const data: Server[] = [
  { id: 's1', name: 'api-gateway', region: 'us-east-1', status: 'Healthy', cpu: 42 },
  { id: 's2', name: 'auth-service', region: 'eu-west-1', status: 'Degraded', cpu: 88 },
  { id: 's3', name: 'cache-node', region: 'us-east-1', status: 'Healthy', cpu: 17 },
  { id: 's4', name: 'worker-pool', region: 'ap-south-1', status: 'Healthy', cpu: 63 },
];

const columns: TableColumn<Server>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'region', header: 'Region', sortable: true },
  { key: 'status', header: 'Status' },
  { key: 'cpu', header: 'CPU %', align: 'right', sortable: true },
];

const meta: Meta<typeof Table<Server>> = {
  title: 'Components/Data/Table',
  component: Table,
  args: {
    columns,
    data,
    caption: 'Cluster nodes',
  },
  argTypes: {
    density: { control: 'inline-radio', options: ['short', 'medium', 'tall'] },
    verticalAlign: { control: 'inline-radio', options: ['top', 'middle', 'baseline'] },
    layout: { control: 'inline-radio', options: ['auto', 'fixed'] },
    isStriped: { control: 'boolean' },
    selectable: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Table<Server>>;

export const Default: Story = {};

export const Striped: Story = {
  args: { isStriped: true },
};

export const Dense: Story = {
  args: { density: 'short', isStriped: true },
};

export const Tall: Story = {
  args: { density: 'tall' },
};

export const FixedLayout: Story = {
  args: { layout: 'fixed' },
};

/** Controlled single-column sort. */
export const Sortable: Story = {
  render: (args) => {
    const [sort, setSort] = useState<TableSort | null>({ columnKey: 'cpu', direction: 'desc' });
    return <Table {...args} sort={sort} onSortChange={setSort} />;
  },
};

/** Header + per-row selection checkboxes. */
export const Selectable: Story = {
  render: (args) => {
    const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set(['s1']));
    return (
      <Table {...args} selectable selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} />
    );
  },
};
