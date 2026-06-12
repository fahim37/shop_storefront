import { Spinner } from "@/components/ui/spinner";

export default function ShopLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-7 text-primary" />
    </div>
  );
}
