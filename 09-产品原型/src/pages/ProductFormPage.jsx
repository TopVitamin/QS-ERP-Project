import { ProductForm } from '../components/erp/ProductForm.jsx';
import { PRODUCT_STORAGE_KEY, products } from '../data/productData.js';

const productFormConfig = {
  storageKey: PRODUCT_STORAGE_KEY,
  seedRows: products,
  listPageId: 'base-product',
  createTitle: '新增商品',
  editTitle: '编辑商品',
  saveSuccessMessage: '商品已保存',
};

export function ProductCreatePage(props) {
  return <ProductForm mode="create" config={productFormConfig} {...props} />;
}

export function ProductEditPage(props) {
  return <ProductForm mode="edit" config={productFormConfig} {...props} />;
}
