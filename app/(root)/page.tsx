import ProductList from "@/components/shared/product/product-list";
import sampleData from "@/db/sample-data";

const HomePage = async () => {
  return (
    <>
      <ProductList data={sampleData.products} title="Newest Arrivals"/>
    </>
  );
};

export default HomePage;
