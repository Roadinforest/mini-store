import ProductList from "@/components/shared/product/product-list";
import { getLatestProducts } from "@/lib/actions/product.actions";

const HomePage = async () => {
  const latesProducts = await getLatestProducts();
  return (
    <>
      <ProductList data={latesProducts} title="Newest Arrivals" limit={6} />
    </>
  );
};

export default HomePage;
