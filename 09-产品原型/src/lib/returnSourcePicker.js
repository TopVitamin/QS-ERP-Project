const emptyReturnSourceFilters = () => ({
  documentNo: '',
  partner: '',
  productCode: '',
});

/**
 * 退货溯源选单弹窗筛选：单号模糊、伙伴精确、商品编码模糊（任一行命中即可）。
 */
export function filterReturnSourceDocuments(
  candidates,
  filters,
  { getDocumentNo, getPartner, getLineProductCodes },
) {
  const documentNo = (filters?.documentNo || '').trim().toLowerCase();
  const partner = filters?.partner || '';
  const productCode = (filters?.productCode || '').trim().toLowerCase();

  return (candidates || []).filter((doc) => {
    if (documentNo && !String(getDocumentNo(doc) || '').toLowerCase().includes(documentNo)) {
      return false;
    }
    if (partner && getPartner(doc) !== partner) {
      return false;
    }
    if (productCode) {
      const codes = getLineProductCodes(doc) || [];
      const hit = codes.some((code) => String(code || '').toLowerCase().includes(productCode));
      if (!hit) return false;
    }
    return true;
  });
}

export function createReturnSourceFilters() {
  return emptyReturnSourceFilters();
}
