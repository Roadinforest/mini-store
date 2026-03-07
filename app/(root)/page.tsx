import ProductCarousel from "@/components/shared/product/product-carousel";
import ProductList from "@/components/shared/product/product-list";
import { getFeaturedProducts, getLatestProducts } from "@/lib/actions/product.actions";
import ViewAllProductsButton from "@/components/view-all-products-button";
import IconBoxes from "@/components/icon-boxes";
import DealCountdown from "@/components/deal-countdown";

export const dynamic = "force-static";
export const revalidate = 3600;

const HomePage = async () => {
  const latesProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  return (
    <>
      {featuredProducts.length > 0 && <ProductCarousel data={featuredProducts} />}
      <ProductList data={latesProducts} title="Newest Arrivals" limit={6} />
      <ViewAllProductsButton />
      <DealCountdown />
      <IconBoxes />
    </>
  );
};

export default HomePage;
