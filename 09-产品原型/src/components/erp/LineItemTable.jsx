import { Trash2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import {
  calculateGrossAmount,
  calculateNetAmount,
  calculateNetUnitPrice4,
  calculateTaxAmount,
  EMPTY_PLACEHOLDER,
  formatAmount,
  formatUnitPrice,
  productLabel,
} from '../../lib/format.js';
import { FieldAffordance, FieldTrigger } from '../ui/field.jsx';
import { FieldLabelContent, parseFieldLabel } from '../ui/form-field.jsx';
import { cn } from '../../lib/utils.js';
import { DocumentSummaryBar } from './DocumentSummaryBar.jsx';
import { SkuSelectionDialog } from './SkuSelectionDialog.jsx';

const tableShellClassName = 'table-scroll overflow-x-auto';
const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row';
const tdClassName = 'border-r border-erp-border-table-column align-middle last:border-r-0';
const cellPaddingClassName = 'px-1.5';
const readCellClassName = 'px-2';

const variants = {
  order: {
    minWidth: '1880px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[88px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[72px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码 *', required: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'quantity', label: '采购数量 *', align: 'right', required: true },
      { key: 'price', label: '含税单价 *', align: 'right', required: true },
      { key: 'taxRate', label: '税率 *', align: 'right', required: true },
      { key: 'netPrice', label: '不含税单价', align: 'right', readOnly: true },
      { key: 'grossAmount', label: '价税合计', align: 'right', readOnly: true },
      { key: 'taxAmount', label: '税额', align: 'right', readOnly: true },
      { key: 'netAmount', label: '金额', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '采购数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
      { key: 'received', label: '累计入库', align: 'right', muted: true },
      { key: 'remainingInbound', label: '剩余入库', align: 'right', muted: true },
      { key: 'pushableQty', label: '可下推', align: 'right', muted: true },
      { key: 'notifyQty', label: '在途通知', align: 'right', muted: true },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[88px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[80px]', 'w-[80px]', 'w-[80px]', 'w-[80px]'],
  },
  'receipt-notice': {
    minWidth: '1090px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'pushableQty', label: '可下推数量', align: 'right', readOnly: true },
      { key: 'notifyQty', label: '通知数量 *', align: 'right', required: true },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'notifyQty', label: '通知数量', align: 'right' },
      { key: 'receivedQty', label: '实收数量', align: 'right' },
      { key: 'shortQty', label: '缺收数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'sales-order': {
    minWidth: '1880px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[88px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[72px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码 *', required: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'quantity', label: '销售数量 *', align: 'right', required: true },
      { key: 'price', label: '含税单价 *', align: 'right', required: true },
      { key: 'taxRate', label: '税率 *', align: 'right', required: true },
      { key: 'netPrice', label: '不含税单价', align: 'right', readOnly: true },
      { key: 'grossAmount', label: '价税合计', align: 'right', readOnly: true },
      { key: 'taxAmount', label: '税额', align: 'right', readOnly: true },
      { key: 'netAmount', label: '金额', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '销售数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
      { key: 'shipped', label: '累计实际出库', align: 'right', muted: true },
      { key: 'remainingShip', label: '剩余出库', align: 'right', muted: true },
      { key: 'pushableQty', label: '可下推', align: 'right', muted: true },
      { key: 'notifyQty', label: '在途通知', align: 'right', muted: true },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[88px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[80px]', 'w-[80px]', 'w-[80px]', 'w-[80px]'],
  },
  'delivery-notice': {
    minWidth: '1090px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'pushableQty', label: '可下推数量', align: 'right', readOnly: true },
      { key: 'notifyQty', label: '通知数量 *', align: 'right', required: true },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'notifyQty', label: '通知数量', align: 'right' },
      { key: 'shippedQty', label: '实出数量', align: 'right' },
      { key: 'shortQty', label: '缺出数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'sales-outbound': {
    minWidth: '1520px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实际出库数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'purchase-inbound': {
    minWidth: '1520px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实际入库数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'purchase-return': {
    minWidth: '1760px',
    colgroup: ['w-10', 'w-[150px]', 'w-[72px]', 'w-[180px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[80px]', 'w-[80px]', 'w-[80px]', 'w-[64px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'sourceInboundLine', label: '来源入库单行', readOnly: true },
      { key: 'quantity', label: '退货数量 *', align: 'right', required: true },
      { key: 'price', label: '含税单价 *', align: 'right', required: true },
      { key: 'taxRate', label: '税率 *', align: 'right', required: true },
      { key: 'netPrice', label: '不含税单价', align: 'right', readOnly: true },
      { key: 'grossAmount', label: '价税合计', align: 'right', readOnly: true },
      { key: 'taxAmount', label: '税额', align: 'right', readOnly: true },
      { key: 'netAmount', label: '金额', align: 'right', readOnly: true },
      { key: 'receivedQty', label: '累计实出', align: 'right', readOnly: true },
      { key: 'inTransitQty', label: '在途通知', align: 'right', readOnly: true },
      { key: 'pushableQty', label: '可下推', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'unit', label: '基本单位' },
      { key: 'sourceInboundLine', label: '来源入库单行' },
      { key: 'quantity', label: '退货数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
      { key: 'receivedQty', label: '累计实出', align: 'right', muted: true },
      { key: 'inTransitQty', label: '在途通知', align: 'right', muted: true },
      { key: 'pushableQty', label: '可下推', align: 'right', muted: true },
    ],
    viewColgroup: ['w-10', 'w-[150px]', 'w-[72px]', 'w-[180px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[80px]', 'w-[80px]', 'w-[80px]'],
  },
  'purchase-return-notice': {
    minWidth: '1090px',
    colgroup: ['w-10', 'w-[190px]', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceReturnLine', label: '来源退货单行', readOnly: true },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'pushableQty', label: '可下推数量', align: 'right', readOnly: true },
      { key: 'notifyQty', label: '通知数量 *', align: 'right', required: true },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceReturnLine', label: '来源退货单行' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'notifyQty', label: '通知数量', align: 'right' },
      { key: 'shippedQty', label: '实出数量', align: 'right' },
      { key: 'shortQty', label: '缺出数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'purchase-return-outbound': {
    minWidth: '1420px',
    colgroup: ['w-10', 'w-[190px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceNoticeLine', label: '来源发货通知行' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实出数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'sales-return': {
    minWidth: '1760px',
    colgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[180px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[80px]', 'w-[80px]', 'w-[80px]', 'w-[64px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码 *', required: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'sourceOutboundLine', label: '来源出库单行', readOnly: true },
      { key: 'quantity', label: '退货数量 *', align: 'right', required: true },
      { key: 'price', label: '含税单价 *', align: 'right', required: true },
      { key: 'taxRate', label: '税率 *', align: 'right', required: true },
      { key: 'netPrice', label: '不含税单价', align: 'right', readOnly: true },
      { key: 'grossAmount', label: '价税合计', align: 'right', readOnly: true },
      { key: 'taxAmount', label: '税额', align: 'right', readOnly: true },
      { key: 'netAmount', label: '金额', align: 'right', readOnly: true },
      { key: 'returnedQty', label: '累计实退', align: 'right', readOnly: true },
      { key: 'inTransitQty', label: '在途通知', align: 'right', readOnly: true },
      { key: 'pushableQty', label: '可下推', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'sourceOutboundLine', label: '来源出库单行' },
      { key: 'quantity', label: '退货数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
      { key: 'returnedQty', label: '累计实退', align: 'right', muted: true },
      { key: 'inTransitQty', label: '在途通知', align: 'right', muted: true },
      { key: 'pushableQty', label: '可下推', align: 'right', muted: true },
    ],
    viewColgroup: ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[180px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[80px]', 'w-[80px]', 'w-[80px]'],
  },
  'sales-return-inbound': {
    minWidth: '1420px',
    colgroup: ['w-10', 'w-[190px]', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceNoticeLine', label: '来源收货通知行' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实收数量', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
      { key: 'grossAmount', label: '价税合计', align: 'right' },
      { key: 'taxAmount', label: '税额', align: 'right' },
      { key: 'netAmount', label: '金额', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[64px]', 'w-[96px]', 'w-[96px]', 'w-[72px]', 'w-[96px]', 'w-[96px]', 'w-[96px]', 'w-[96px]'],
  },
  'price-adjust': {
    minWidth: '980px',
    colgroup: ['w-10', 'w-[120px]', 'w-[120px]', 'w-[150px]', 'w-[72px]', 'w-[110px]', 'w-[88px]', 'w-[110px]', 'w-[72px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码 *', required: true },
      { key: 'barcode', label: '商品条码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'price', label: '含税单价 *', align: 'right', required: true, step: '0.0001' },
      { key: 'taxRate', label: '税率 *', align: 'right', required: true },
      { key: 'netPrice', label: '不含税单价', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'productCode', label: '商品编码' },
      { key: 'barcode', label: '商品条码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'netPrice', label: '不含税单价', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[120px]', 'w-[120px]', 'w-[150px]', 'w-[72px]', 'w-[110px]', 'w-[88px]', 'w-[110px]'],
  },
  inbound: {
    minWidth: '1050px',
    colgroup: ['w-10', 'w-[205px]', 'w-[160px]', 'w-[74px]', 'w-[110px]', 'w-[110px]', 'w-[110px]', 'w-[130px]', 'w-[150px]', 'w-[72px]'],
    editColumns: [
      { key: 'index', label: '#', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'spec', label: '规格型号' },
      { key: 'unit', label: '单位' },
      { key: 'orderQuantity', label: '订单数量', align: 'right', readOnly: true },
      { key: 'quantity', label: '本次入库 *', align: 'right', required: true },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'amount', label: '入库金额', align: 'right' },
      { key: 'remark', label: '备注' },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '#', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'spec', label: '规格型号' },
      { key: 'unit', label: '单位' },
      { key: 'orderQuantity', label: '订单数量', align: 'right' },
      { key: 'quantity', label: '本次入库', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'amount', label: '入库金额', align: 'right' },
      { key: 'remark', label: '备注' },
    ],
    viewColgroup: ['w-10', 'w-[205px]', 'w-[160px]', 'w-[74px]', 'w-[110px]', 'w-[110px]', 'w-[110px]', 'w-[130px]', 'w-[150px]'],
  },
  // —— 库存管理：其他出入库与调拨明细 ——
  // 这些单据不含价税字段，明细只有商品、基本单位与数量；数量一期为整数。
  'other-inbound-request': {
    minWidth: '1080px',
    colgroup: ['w-10', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]', 'w-[64px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'quantity', label: '申请入库数量 *', align: 'right', required: true },
      { key: 'actualQty', label: '实收数量', align: 'right', readOnly: true },
      { key: 'remainingQty', label: '未收数量', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '申请入库数量', align: 'right' },
      { key: 'actualQty', label: '实收数量', align: 'right' },
      { key: 'remainingQty', label: '未收数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]'],
  },
  'other-outbound-request': {
    minWidth: '1080px',
    colgroup: ['w-10', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]', 'w-[64px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'quantity', label: '申请出库数量 *', align: 'right', required: true },
      { key: 'actualQty', label: '实出数量', align: 'right', readOnly: true },
      { key: 'remainingQty', label: '未出数量', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '申请出库数量', align: 'right' },
      { key: 'actualQty', label: '实出数量', align: 'right' },
      { key: 'remainingQty', label: '未出数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]'],
  },
  'other-inbound': {
    minWidth: '980px',
    colgroup: ['w-10', 'w-[170px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[130px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceInboundLine', label: '来源申请行' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实际入库数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[170px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[130px]'],
  },
  'other-outbound': {
    minWidth: '980px',
    colgroup: ['w-10', 'w-[170px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[130px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceOutboundLine', label: '来源申请行' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实际出库数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[170px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[130px]'],
  },
  'transfer-order': {
    minWidth: '1320px',
    colgroup: ['w-10', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]', 'w-[110px]', 'w-[100px]', 'w-[64px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'quantity', label: '计划调拨数量 *', align: 'right', required: true },
      { key: 'actualOutQty', label: '累计实际调出', align: 'right', readOnly: true },
      { key: 'actualInQty', label: '累计实际调入', align: 'right', readOnly: true },
      { key: 'remainingQty', label: '未调出数量', align: 'right', readOnly: true },
      { key: 'inTransitQty', label: '在途数量', align: 'right', readOnly: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '计划调拨数量', align: 'right' },
      { key: 'actualOutQty', label: '累计实际调出', align: 'right' },
      { key: 'actualInQty', label: '累计实际调入', align: 'right' },
      { key: 'remainingQty', label: '未调出数量', align: 'right' },
      { key: 'inTransitQty', label: '在途数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]', 'w-[110px]', 'w-[100px]'],
  },
  'transfer-out-notice': {
    minWidth: '1180px',
    colgroup: ['w-10', 'w-[180px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceTransferLine', label: '来源调拨单行' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '通知调出数量', align: 'right' },
      { key: 'actualQty', label: '实际调出数量', align: 'right' },
      { key: 'remainingQty', label: '未发数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[180px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]'],
  },
  'transfer-in-notice': {
    minWidth: '1180px',
    colgroup: ['w-10', 'w-[180px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]'],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceTransferLine', label: '来源调拨单行' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '通知调入数量', align: 'right' },
      { key: 'actualQty', label: '实际调入数量', align: 'right' },
      { key: 'shortageQty', label: '少收数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[180px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[110px]', 'w-[110px]'],
  },
  'direct-transfer': {
    minWidth: '1080px',
    colgroup: ['w-10', 'w-[180px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]', 'w-[64px]'],
    editColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceNoticeLine', label: '来源明细行', readOnly: true },
      { key: 'product', label: '商品 *', required: true },
      { key: 'productCode', label: '商品编码', readOnly: true },
      { key: 'productName', label: '商品名称', readOnly: true },
      { key: 'unit', label: '基本单位', readOnly: true },
      { key: 'quantity', label: '实际调拨数量 *', align: 'right', required: true },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '行号', align: 'center' },
      { key: 'sourceNoticeLine', label: '来源明细行' },
      { key: 'product', label: '商品' },
      { key: 'productCode', label: '商品编码' },
      { key: 'productName', label: '商品名称' },
      { key: 'unit', label: '基本单位' },
      { key: 'quantity', label: '实际调拨数量', align: 'right' },
    ],
    viewColgroup: ['w-10', 'w-[180px]', 'w-[190px]', 'w-[112px]', 'w-[160px]', 'w-[64px]', 'w-[120px]'],
  },
};

function alignClassName(align) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

const emptyEditorOptions = {
  productOptions: [],
  unitOptions: [],
  taxRateOptions: [],
};

/** 明细行内错误：出错单元格用红色完整边框标出（boxed 控件）。 */
const cellInvalidClassName = 'border-erp-danger hover:border-erp-danger focus-visible:border-erp-danger';

function renderEditCell({ column, line, index, onLineChange, onLineRemove, onProductSelect, skuPickerEnabled, editorOptions, lineActions, cellInvalid = false }) {
  const rowLabel = `第${index + 1}行`;
  const cellLabel = `${rowLabel}${parseFieldLabel(column.label).text}`;

  switch (column.key) {
    case 'index':
      return <span className="text-erp-text-muted">{index + 1}</span>;
    case 'product':
      if (skuPickerEnabled && editorOptions.skuOptions?.length) {
        return (
          <FieldTrigger
            aria-label={`${rowLabel}商品`}
            aria-haspopup="dialog"
            hasValue={Boolean(line.product)}
            variant="boxed"
            className={cellInvalid ? cellInvalidClassName : undefined}
            aria-invalid={cellInvalid || undefined}
            onClick={() => onProductSelect?.(line.id)}
          >
            <span className="truncate">{productLabel(line.product, editorOptions.productOptions)}</span>
            <FieldAffordance hasValue={false} />
          </FieldTrigger>
        );
      }
      return (
        <SelectField
          options={editorOptions.productOptions}
          value={line.product}
          onValueChange={(value) => onLineChange(line.id, 'product', value)}
          placeholder="请选择商品"
          ariaLabel={`${rowLabel}商品`}
          variant="boxed"
          invalid={cellInvalid}
          className={cellInvalid ? cellInvalidClassName : undefined}
        />
      );
    case 'spec':
      return <Input variant="boxed" value={line.spec} onChange={(event) => onLineChange(line.id, 'spec', event.target.value)} placeholder="规格型号" aria-label={cellLabel} className={cellInvalid ? cellInvalidClassName : undefined} />;
    case 'unit':
      if (column.readOnly) {
        return <span className="text-erp-text-muted">{line.unit || EMPTY_PLACEHOLDER}</span>;
      }
      return (
        <SelectField
          options={editorOptions.unitOptions}
          value={line.unit}
          onValueChange={(value) => onLineChange(line.id, 'unit', value)}
          ariaLabel={`${rowLabel}单位`}
          variant="boxed"
          invalid={cellInvalid}
          className={cellInvalid ? cellInvalidClassName : undefined}
        />
      );
    case 'quantity':
      return (
        <Input
          variant="boxed"
          type="number"
          min="0"
          max={line.orderQuantity || undefined}
          value={line.quantity}
          onChange={(event) => onLineChange(line.id, 'quantity', event.target.value)}
          className={cn('text-right', cellInvalid && cellInvalidClassName)}
          aria-label={cellLabel}
        />
      );
    case 'orderQuantity':
    case 'received':
    case 'pushableQty':
    case 'receivedQty':
    case 'returnedQty':
    case 'inTransitQty':
    case 'shippedQty':
    case 'shortQty':
      return <span className="text-erp-text-muted">{line[column.key] ?? 0}</span>;
    case 'sourceInboundLine':
    case 'sourceReturnLine':
    case 'sourceOutboundLine':
    case 'sourceNoticeLine':
      return <span className="text-erp-text-muted">{line[column.key] || EMPTY_PLACEHOLDER}</span>;
    case 'notifyQty':
      return (
        <Input
          variant="boxed"
          type="number"
          min="0"
          max={line.pushableQty || undefined}
          value={line.notifyQty}
          onChange={(event) => onLineChange(line.id, 'notifyQty', event.target.value)}
          className={cn('text-right', cellInvalid && cellInvalidClassName)}
          aria-label={cellLabel}
        />
      );
    case 'price':
      return (
        <Input
          variant="boxed"
          type="number"
          min="0"
          step={column.step || '0.0001'}
          value={line.price}
          onChange={(event) => onLineChange(line.id, 'price', event.target.value)}
          className={cn('text-right', cellInvalid && cellInvalidClassName)}
          aria-label={cellLabel}
        />
      );
    case 'taxRate':
      return (
        <SelectField
          options={editorOptions.taxRateOptions}
          value={line.taxRate}
          onValueChange={(value) => onLineChange(line.id, 'taxRate', value)}
          ariaLabel={`${rowLabel}税率`}
          variant="boxed"
          invalid={cellInvalid}
          className={cellInvalid ? cellInvalidClassName : undefined}
        />
      );
    case 'productCode':
      if (skuPickerEnabled && editorOptions.skuOptions?.length) {
        return (
          <FieldTrigger
            aria-label={`${rowLabel}商品编码`}
            aria-haspopup="dialog"
            hasValue={Boolean(line.product)}
            variant="boxed"
            className={cellInvalid ? cellInvalidClassName : undefined}
            aria-invalid={cellInvalid || undefined}
            onClick={() => onProductSelect?.(line.id)}
          >
            <span className="truncate">{line.productCode || '请选择商品'}</span>
            <FieldAffordance hasValue={false} />
          </FieldTrigger>
        );
      }
      return <span className="text-erp-text-muted">{line.productCode || EMPTY_PLACEHOLDER}</span>;
    case 'productName':
    case 'barcode':
      return <span className="text-erp-text-muted">{line[column.key] || EMPTY_PLACEHOLDER}</span>;
    case 'grossAmount':
      return <span className="font-medium text-erp-text-section">{formatAmount(calculateGrossAmount(line))}</span>;
    case 'taxAmount':
      return <span className="text-erp-text-muted">{formatAmount(calculateTaxAmount(line))}</span>;
    case 'netAmount':
      return <span className="text-erp-text-muted">{formatAmount(calculateNetAmount(line))}</span>;
    case 'amount':
      return <span className="font-medium text-erp-text-section">{formatAmount(calculateGrossAmount(line))}</span>;
    case 'netPrice':
      return <span className="text-erp-text-muted">{formatUnitPrice(calculateNetUnitPrice4(line))}</span>;
    case 'remark':
      return <Input variant="boxed" value={line.remark} onChange={(event) => onLineChange(line.id, 'remark', event.target.value)} placeholder="-" aria-label={cellLabel} className={cellInvalid ? cellInvalidClassName : undefined} />;
    case 'actions':
      return (
        <span className="inline-flex items-center gap-1.5">
          {(lineActions || []).map((action) => (
            <button
              key={action.id}
              type="button"
              className="px-1 text-erp-primary hover:underline"
              onClick={() => action.onClick?.(line)}
            >
              {action.label}
            </button>
          ))}
          <Button variant="danger" size="icon" aria-label={`删除${rowLabel}`} title="删除明细" onClick={() => onLineRemove(line.id)}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
        </span>
      );
    default:
      return line[column.key] ?? EMPTY_PLACEHOLDER;
  }
}

function renderViewCell({ column, line, editorOptions }) {
  switch (column.key) {
    case 'product':
      return productLabel(line.product, editorOptions.productOptions);
    case 'spec':
    case 'unit':
    case 'remark':
      return line[column.key] || EMPTY_PLACEHOLDER;
    case 'productCode':
    case 'barcode':
    case 'productName':
      return line[column.key] || EMPTY_PLACEHOLDER;
    case 'sourceNoticeLine':
    case 'sourceOutboundLine':
    case 'sourceInboundLine':
    case 'sourceReturnLine':
    case 'sourceTransferLine':
      return line[column.key] || EMPTY_PLACEHOLDER;
    case 'quantity':
    case 'orderQuantity':
    case 'received':
      return line[column.key] || 0;
    case 'remainingInbound':
      return line.remainingInbound ?? Math.max(0, Number(line.quantity || 0) - Number(line.received || 0));
    case 'price':
      return formatUnitPrice(line.price);
    case 'taxRate':
      return line.taxRate ? `${line.taxRate}%` : EMPTY_PLACEHOLDER;
    case 'grossAmount':
      return formatAmount(calculateGrossAmount(line));
    case 'taxAmount':
      return formatAmount(calculateTaxAmount(line));
    case 'netAmount':
      return formatAmount(calculateNetAmount(line));
    case 'amount':
      return formatAmount(calculateGrossAmount(line));
    case 'netPrice':
      return formatUnitPrice(calculateNetUnitPrice4(line));
    case 'notifyQty':
    case 'pushableQty':
    case 'receivedQty':
    case 'shortQty':
    case 'shippedQty':
    case 'returnedQty':
    case 'inTransitQty':
      return line[column.key] ?? 0;
    default:
      return line[column.key] ?? EMPTY_PLACEHOLDER;
  }
}

export function LineItemTable({
  variant,
  mode = 'view',
  lines,
  rowKeyPrefix = 'line',
  onLineChange,
  onLineRemove,
  onLineSkusSelect,
  enableSkuPicker = false,
  editorOptions = emptyEditorOptions,
  summary,
  hiddenColumns = [],
  lineActions,
  lineErrors = {},
}) {
  const [skuDialogLineId, setSkuDialogLineId] = useState(null);
  const config = variants[variant];
  const isEdit = mode === 'edit';
  const hiddenKeys = new Set(hiddenColumns);
  const columns = (isEdit ? config.editColumns : config.viewColumns).filter((column) => !hiddenKeys.has(column.key));
  const colgroup = isEdit ? config.colgroup : (config.viewColgroup || config.colgroup.slice(0, -1));
  const visibleColgroup = colgroup.filter((width, index) => !hiddenKeys.has((isEdit ? config.editColumns : config.viewColumns)[index]?.key));
  const activeSkuLine = lines.find((line) => line.id === skuDialogLineId);
  const skuOptions = enableSkuPicker ? (editorOptions.skuOptions || []) : [];

  return (
    <div className={tableShellClassName}>
      <table className={tableClassName} style={{ minWidth: config.minWidth }}>
        <colgroup>
          {visibleColgroup.map((width, index) => (
            <col key={`${width}-${index}`} className={width} />
          ))}
        </colgroup>
        <thead className={theadClassName}>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn(thClassName, alignClassName(column.align))}>
                <span className="inline-flex min-w-0 items-center">
                  <FieldLabelContent label={column.label} required={column.required} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const rowErrors = lineErrors[line.id] || {};
            const rowErrorMessages = Object.values(rowErrors);
            return (
              <Fragment key={line.id || `${rowKeyPrefix}-${index}`}>
                <tr className={rowClassName}>
                  {columns.map((column) => {
                    const isActionCell = column.key === 'actions';
                    const readOnlyKeys = new Set(['amount', 'grossAmount', 'taxAmount', 'netAmount', 'netPrice', 'productName', 'barcode', 'sourceInboundLine', 'sourceReturnLine', 'sourceOutboundLine', 'sourceNoticeLine', 'receivedQty', 'returnedQty', 'inTransitQty', 'shippedQty', 'shortQty', 'pushableQty']);
                    const isPickerCell = isEdit && column.key === 'productCode' && enableSkuPicker;
                    const isEditableCell = (isEdit && !column.readOnly && !isActionCell && column.key !== 'index' && !readOnlyKeys.has(column.key)) || isPickerCell;
                    const content = isEdit
                      ? renderEditCell({ column, line, index, onLineChange, onLineRemove, onProductSelect: setSkuDialogLineId, skuPickerEnabled: enableSkuPicker, editorOptions, lineActions, cellInvalid: Boolean(rowErrors[column.key]) })
                      : column.key === 'index'
                        ? index + 1
                        : renderViewCell({ column, line, editorOptions });

                    return (
                      <td
                        key={column.key}
                        className={cn(
                          tdClassName,
                          alignClassName(column.align),
                          isEditableCell ? cellPaddingClassName : readCellClassName,
                          column.key === 'product' && !isEdit && 'text-erp-text',
                          column.muted && 'text-erp-text-muted',
                          (column.key === 'amount' || column.key === 'grossAmount') && 'font-medium text-erp-text-section',
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
                {rowErrorMessages.length > 0 && (
                  <tr
                    data-line-error={line.id}
                    className="border-b border-erp-border-table-row bg-erp-danger-bg/50"
                  >
                    <td colSpan={columns.length} className="px-2 py-1 text-[12px] leading-4 text-erp-danger" role="alert">
                      {rowErrorMessages.join('；')}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {summary && <DocumentSummaryBar columns={columns} summary={summary} />}
      </table>
      {isEdit && skuOptions.length > 0 && (
        <SkuSelectionDialog
          open={Boolean(activeSkuLine)}
          onOpenChange={(open) => {
            if (!open) setSkuDialogLineId(null);
          }}
          options={skuOptions}
          selectedValues={activeSkuLine?.product ? [activeSkuLine.product] : []}
          onConfirm={(selectedSkus) => {
            if (activeSkuLine) onLineSkusSelect?.(activeSkuLine.id, selectedSkus);
            setSkuDialogLineId(null);
          }}
        />
      )}
    </div>
  );
}
