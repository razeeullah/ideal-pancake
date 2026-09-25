"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  HelpCircle,
  Landmark,
  LayoutGrid,
  List,
  LoaderCircle,
  MessageCircle,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POS_CATEGORIES, POS_CUSTOMERS, POS_PRODUCTS } from "@/features/point-of-sale/mock-data";
import { formatDateTime, formatPkr, getCartTotals } from "@/features/point-of-sale/calculations";
import type {
  CartItem,
  CompletedInvoice,
  DiscountType,
  HeldInvoice,
  PaymentMethod,
  PosCustomer,
  PosProduct,
  TileCategory,
} from "@/features/point-of-sale/types";

const STORAGE_KEY = "friends_distributors_pos_v3";
const TAX_RATE = 18;
const PAGE_SIZE_GRID = 12;
const PAGE_SIZE_LIST = 16;

const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required."),
  phone: z.string().trim().min(7, "Valid phone number is required."),
  email: z.string().trim().email("Invalid email.").or(z.literal("")),
  address: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
});
type CustomerForm = z.infer<typeof customerSchema>;

const paymentMethods: readonly {
  value: PaymentMethod;
  label: string;
  icon: typeof Banknote;
  shortcut: string;
}[] = [
  { value: "CASH", label: "Cash", icon: Banknote, shortcut: "F9" },
  { value: "CARD", label: "Card", icon: CreditCard, shortcut: "" },
  { value: "MOBILE_WALLET", label: "Raast / UPI", icon: Smartphone, shortcut: "" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark, shortcut: "" },
];

function Modal({
  title,
  children,
  onClose,
  className = "max-w-lg",
}: Readonly<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}>) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-xs"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        aria-modal="true"
        role="dialog"
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b pb-3">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <Button
            ref={closeButton}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TileSurface({
  product,
  small = false,
}: Readonly<{ product: PosProduct; small?: boolean }>) {
  return (
    <div
      aria-hidden="true"
      className={`${product.imageClass} relative overflow-hidden rounded-lg border border-black/10 ${
        small ? "size-10 shrink-0" : "aspect-[1.25] w-full"
      }`}
    >
      <span className="absolute inset-0 bg-white/5" />
    </div>
  );
}

export function PointOfSaleDemo() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [products] = useState<readonly PosProduct[]>(POS_PRODUCTS);
  const [customers, setCustomers] = useState<PosCustomer[]>(() => [...POS_CUSTOMERS]);
  
  // Clean default: Empty cart!
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("walk-in");
  const [selectedCategory, setSelectedCategory] = useState<TileCategory>("All Products");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cashTendered, setCashTendered] = useState<string>("");

  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [dialog, setDialog] = useState<
    | "customer"
    | "hold"
    | "heldList"
    | "success"
    | "shortcuts"
    | null
  >(null);
  const [holdNote, setHoldNote] = useState("");
  const [completedInvoice, setCompletedInvoice] = useState<CompletedInvoice | null>(null);

  // Restore saved held invoices & preferences, but never force dummy cart items
  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.heldInvoices)) setHeldInvoices(parsed.heldInvoices);
          if (Array.isArray(parsed.customers)) setCustomers(parsed.customers);
          if (Array.isArray(parsed.cart)) setCart(parsed.cart);
          if (typeof parsed.selectedCustomerId === "string")
            setSelectedCustomerId(parsed.selectedCustomerId);
          if (parsed.viewMode === "grid" || parsed.viewMode === "list")
            setViewMode(parsed.viewMode);
        }
      } catch {
        // clean fallback
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(restoreFrame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cart,
        heldInvoices,
        customers,
        selectedCustomerId,
        viewMode,
      }),
    );
  }, [cart, customers, heldInvoices, hydrated, selectedCustomerId, viewMode]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus Search: / or F2 or Ctrl+K / Cmd+K
      if (
        (event.key === "/" && (event.target as HTMLElement).tagName !== "INPUT") ||
        event.key === "F2" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      // F4: New Sale
      if (event.key === "F4") {
        event.preventDefault();
        startNewSale();
        return;
      }
      // F8: Hold Sale
      if (event.key === "F8") {
        event.preventDefault();
        if (cart.length > 0) {
          setDialog("hold");
        } else {
          toast.info("Cart is already empty.");
        }
        return;
      }
      // F9: Complete Sale
      if (event.key === "F9") {
        event.preventDefault();
        if (cart.length > 0) {
          completeSale();
        }
        return;
      }
      // ?: Show shortcuts modal
      if (event.key === "?" && (event.target as HTMLElement).tagName !== "INPUT") {
        event.preventDefault();
        setDialog("shortcuts");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory =
        selectedCategory === "All Products" || product.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const haystack = `${product.name} ${product.sku} ${product.brand} ${product.category} ${product.finish} ${product.dimensions}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, searchQuery, selectedCategory]);

  const pageSize = viewMode === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? customers[0]!;

  const effectiveTaxRate = taxEnabled ? TAX_RATE : 0;
  const totals = getCartTotals({
    cart,
    products,
    discountValue,
    discountType,
    taxRate: effectiveTaxRate,
  });

  const cartWithProducts = cart.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? [{ item, product }] : [];
  });

  // Calculate change due when cash is selected
  const grandTotalRupees = totals.grandTotalPaise / 100;
  const cashGivenAmount = Number.parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashGivenAmount - grandTotalRupees);
  const remainingDue = Math.max(0, grandTotalRupees - cashGivenAmount);

  function addProduct(product: PosProduct, quantity = 1) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantitySqFt + quantity;
        if (newQty > product.stockSqFt) {
          toast.warning(`Maximum available stock is ${product.stockSqFt} units.`);
          return current;
        }
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantitySqFt: newQty } : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          quantitySqFt: quantity,
          unitPricePaise: product.pricePaise,
        },
      ];
    });
    toast.success(`Added ${product.name}`, { duration: 1500 });
  }

  function updateQuantity(productId: string, quantity: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }

    if (quantity > product.stockSqFt) {
      toast.warning(`Only ${product.stockSqFt} units in stock.`);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantitySqFt: quantity } : item,
      ),
    );
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filteredProducts.length > 0) {
      event.preventDefault();
      // Auto add first result on Enter!
      const first = filteredProducts[0]!;
      addProduct(first);
      setSearchQuery("");
    }
  }

  function completeSale() {
    if (!cart.length) {
      toast.error("Cart is empty. Add items before checking out.");
      return;
    }

    const cashTenderedPaise =
      paymentMethod === "CASH" ? Math.round(cashGivenAmount * 100) : undefined;
    const changeDuePaise =
      paymentMethod === "CASH" ? Math.round(changeDue * 100) : undefined;

    startTransition(() => {
      window.setTimeout(() => {
        const invoice: CompletedInvoice = {
          invoiceNumber: `FD-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Math.floor(
            1000 + Math.random() * 9000,
          )}`,
          createdAt: new Date().toISOString(),
          customerId: selectedCustomer.id,
          items: cart,
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          discountType,
          taxRate: effectiveTaxRate,
          taxPaise: totals.taxPaise,
          grandTotalPaise: totals.grandTotalPaise,
          paymentMethod,
          cashTenderedPaise,
          changeDuePaise,
        };
        setCompletedInvoice(invoice);
        setDialog("success");
        toast.success("Sale completed successfully!");
      }, 300);
    });
  }

  function saveHold() {
    if (!cart.length) {
      toast.error("Cannot park an empty cart.");
      return;
    }
    const invoice: HeldInvoice = {
      id: crypto.randomUUID(),
      reference: `TICKET-${Date.now().toString().slice(-4)}`,
      note: holdNote.trim() || `Held for ${selectedCustomer.name}`,
      items: cart,
      customerId: selectedCustomer.id,
      createdAt: new Date().toISOString(),
    };
    setHeldInvoices((current) => [invoice, ...current]);
    setCart([]);
    setHoldNote("");
    setCashTendered("");
    setDialog(null);
    toast.success(`Sale parked as ${invoice.reference}`);
  }

  function resumeHeldInvoice(invoice: HeldInvoice) {
    setCart(invoice.items);
    setSelectedCustomerId(invoice.customerId);
    setHeldInvoices((current) => current.filter((item) => item.id !== invoice.id));
    setDialog(null);
    toast.success(`Resumed ticket ${invoice.reference}`);
  }

  function discardHeldInvoice(id: string) {
    setHeldInvoices((current) => current.filter((item) => item.id !== id));
    toast.info("Held invoice removed.");
  }

  function startNewSale() {
    setCart([]);
    setDiscountValue(0);
    setCashTendered("");
    setSelectedCustomerId("walk-in");
    setCompletedInvoice(null);
    setDialog(null);
    searchRef.current?.focus();
  }

  const whatsAppUrl = `https://wa.me/${selectedCustomer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hello ${selectedCustomer.name}, thank you for shopping at Friends Distributors. Your invoice #${
      completedInvoice?.invoiceNumber ?? "DRAFT"
    } total is ${formatPkr(
      completedInvoice?.grandTotalPaise ?? totals.grandTotalPaise,
    )}. Have a great day!`,
  )}`;

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100vh-5rem)]">
      {/* 1. TOP TERMINAL STATUS BAR */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Register #01
            </span>
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-normal">
              Main Counter
            </Badge>
          </div>
        </div>

        {/* Center / Right quick actions */}
        <div className="flex items-center gap-2">
          {/* Held tickets indicator */}
          <Button
            type="button"
            variant={heldInvoices.length > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setDialog("heldList")}
            className="gap-1.5 h-8 text-xs font-semibold"
          >
            <Clock className="size-3.5" />
            Held Bills
            {heldInvoices.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                {heldInvoices.length}
              </span>
            )}
          </Button>

          {/* New Sale Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startNewSale}
            className="gap-1.5 h-8 text-xs font-semibold"
            title="Start fresh sale (F4)"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">New Sale</span>
            <kbd className="hidden lg:inline text-[9px] bg-muted px-1 py-0.5 rounded">F4</kbd>
          </Button>

          {/* Keyboard shortcuts */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setDialog("shortcuts")}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN WORKSPACE: LEFT CATALOG + RIGHT PINNED CHECKOUT */}
      <div className="grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_26rem] xl:grid-cols-[minmax(0,1.4fr)_28rem] 2xl:grid-cols-[minmax(0,1.5fr)_30rem]">
        {/* LEFT COLUMN: PRODUCT SEARCH, CATEGORIES & CATALOG */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* High-speed Search & View Toggle */}
          <div className="rounded-xl border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Scan barcode or type SKU / product name... (Press Enter to quick-add)"
                  className="h-10 pl-9 pr-20 text-sm font-medium"
                  autoFocus
                />
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    /
                  </kbd>
                </div>
              </div>

              {/* View density toggle */}
              <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition ${
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="High-Speed List View"
                  aria-label="List View"
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {POS_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Items: Grid or List */}
          {visibleProducts.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const inCartItem = cart.find((item) => item.productId === product.id);
                  const isLow = product.stockSqFt <= 100;
                  return (
                    <div
                      key={product.id}
                      className="group relative flex flex-col justify-between rounded-xl border bg-card p-2.5 shadow-xs transition hover:border-primary/60 hover:shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="text-left focus-visible:outline-none"
                      >
                        <div className="relative">
                          <TileSurface product={product} />
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-mono font-semibold text-white">
                            {product.sku}
                          </span>
                          {inCartItem && (
                            <span className="absolute top-1.5 right-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                              {inCartItem.quantitySqFt} in cart
                            </span>
                          )}
                        </div>

                        <div className="mt-2 min-w-0">
                          <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {product.name}
                          </h4>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground">
                              {formatPkr(product.pricePaise)}
                            </span>
                            <span
                              className={`text-[10px] font-medium ${
                                isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                              }`}
                            >
                              {product.stockSqFt} in stock
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Quick 1-click Add Button */}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => addProduct(product)}
                        className="mt-2 h-7.5 w-full gap-1 rounded-lg text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        <Plus className="size-3.5" />
                        Add to Bill
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Compact High-Speed Table List View */
              <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Item / SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleProducts.map((product) => {
                      const inCartItem = cart.find((item) => item.productId === product.id);
                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => addProduct(product)}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <TileSurface product={product} small />
                              <div>
                                <p className="font-semibold text-foreground">{product.name}</p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {product.sku}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {product.category}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`font-semibold ${
                                product.stockSqFt <= 100
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {product.stockSqFt}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            {formatPkr(product.pricePaise)}
                          </td>
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              size="xs"
                              variant={inCartItem ? "default" : "outline"}
                              onClick={() => addProduct(product)}
                              className="gap-1 h-6 font-semibold"
                            >
                              <Plus className="size-3" />
                              {inCartItem ? `Add (${inCartItem.quantitySqFt})` : "Add"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="grid min-h-60 place-items-center rounded-xl border border-dashed bg-card p-6 text-center">
              <div>
                <Search className="mx-auto size-7 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-semibold">No items match &quot;{searchQuery}&quot;</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Try typing a different name or SKU code.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs"
                >
                  Clear search
                </Button>
              </div>
            </div>
          )}

          {/* Pagination bar */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground shadow-xs">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredProducts.length)} of{" "}
                {filteredProducts.length} items
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon-xs"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="icon-xs"
                    variant={page === currentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  size="icon-xs"
                  variant="outline"
                  disabled={currentPage === pageCount}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PINNED CURRENT BILL & CHECKOUT TERMINAL */}
        <aside className="flex flex-col rounded-2xl border bg-card shadow-sm sticky top-16 overflow-hidden">
          {/* Customer Bar */}
          <div className="border-b bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <UserRound className="size-4 shrink-0 text-muted-foreground" />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Customer selection"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setDialog("customer")}
                className="h-8 shrink-0 gap-1 font-medium"
              >
                <UserPlus className="size-3" />
                New
              </Button>
            </div>
          </div>

          {/* Cart Items List - Scrollable */}
          <div className="flex-1 min-h-[180px] max-h-[32vh] overflow-y-auto p-3 space-y-2">
            {cart.length > 0 ? (
              cartWithProducts.map(({ item, product }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-2 rounded-xl border bg-card p-2 shadow-2xs hover:border-border transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatPkr(item.unitPricePaise)} each
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center rounded-lg border bg-background shadow-xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, item.quantitySqFt - 1)}
                      className="grid size-6 place-items-center hover:bg-muted text-muted-foreground hover:text-foreground rounded-l-md"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stockSqFt}
                      value={item.quantitySqFt}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) updateQuantity(product.id, val);
                      }}
                      className="w-10 text-center text-xs font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, item.quantitySqFt + 1)}
                      className="grid size-6 place-items-center hover:bg-muted text-muted-foreground hover:text-foreground rounded-r-md"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right shrink-0 min-w-16">
                    <p className="text-xs font-bold text-foreground">
                      {formatPkr(item.quantitySqFt * item.unitPricePaise)}
                    </p>
                  </div>

                  {/* Remove Item */}
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, 0)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition"
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="grid min-h-36 place-items-center rounded-xl border border-dashed p-4 text-center">
                <div>
                  <ShoppingCart className="mx-auto size-7 text-muted-foreground/40" />
                  <p className="mt-1 text-xs font-medium text-foreground">Cart is currently empty</p>
                  <p className="text-[11px] text-muted-foreground">
                    Scan a barcode or click products on the left to add.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Calculations & Discounts */}
          <div className="border-t bg-muted/15 p-3 space-y-2 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({totals.totalQuantitySqFt} units)</span>
              <span className="font-semibold text-foreground">
                {formatPkr(totals.subtotalPaise)}
              </span>
            </div>

            {/* Quick Discount */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDiscountValue(d);
                      setDiscountType("PERCENTAGE");
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                      discountValue === d && discountType === "PERCENTAGE"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {d === 0 ? "None" : `${d}%`}
                  </button>
                ))}
                {discountValue > 0 && (
                  <span className="font-semibold text-emerald-600 text-xs">
                    -{formatPkr(totals.discountPaise)}
                  </span>
                )}
              </div>
            </div>

            {/* Tax Toggle */}
            <div className="flex items-center justify-between text-muted-foreground">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary size-3.5"
                />
                <span>Sales Tax (18% GST)</span>
              </label>
              <span className="font-semibold text-foreground">
                {formatPkr(totals.taxPaise)}
              </span>
            </div>

            {/* GRAND TOTAL */}
            <div className="flex items-center justify-between border-t border-border/80 pt-2 text-sm">
              <span className="font-bold text-foreground">Grand Total</span>
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                {formatPkr(totals.grandTotalPaise)}
              </span>
            </div>
          </div>

          {/* Payment Method & Cash Tender */}
          <div className="border-t p-3 space-y-2.5">
            <div className="grid grid-cols-4 gap-1">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-1.5 px-1 text-[11px] font-semibold transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-2xs"
                        : "border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* If CASH selected: Quick Tender Buttons & Change Calculator */}
            {paymentMethod === "CASH" && (
              <div className="rounded-xl border border-blue-200/70 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">Cash Received:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Rs.</span>
                    <Input
                      type="number"
                      placeholder={grandTotalRupees ? String(grandTotalRupees) : "0"}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="h-8 w-24 text-right text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setCashTendered(String(grandTotalRupees))}
                    className="flex-1 text-[10px] h-6 font-bold"
                  >
                    Exact
                  </Button>
                  {[500, 1000, 5000].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setCashTendered(String(preset))}
                      className="flex-1 text-[10px] h-6 font-semibold"
                    >
                      Rs {preset}
                    </Button>
                  ))}
                </div>

                {/* Change calculation */}
                {cashGivenAmount > 0 && (
                  <div className="flex items-center justify-between border-t border-blue-200/60 pt-1.5 text-xs">
                    <span className="font-semibold text-muted-foreground">Change to return:</span>
                    <span
                      className={`text-sm font-extrabold ${
                        changeDue > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : remainingDue > 0
                          ? "text-amber-600"
                          : "text-foreground"
                      }`}
                    >
                      {formatPkr(Math.round(changeDue * 100))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Pinned Action Buttons: Hold + Clear + COMPLETE SALE */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialog("hold")}
                disabled={!cart.length}
                className="gap-1 text-xs font-semibold h-11 flex-1"
                title="Park ticket (F8)"
              >
                <PauseCircle className="size-3.5 text-muted-foreground" />
                Hold
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCart([])}
                disabled={!cart.length}
                className="text-xs font-semibold h-11 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Clear current cart"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={!cart.length || isPending}
                onClick={completeSale}
                className="h-11 flex-[2.5] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition gap-2"
                title="Complete Sale (F9)"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                <span>PAY {formatPkr(totals.grandTotalPaise)}</span>
                <kbd className="hidden xl:inline text-[9px] bg-white/20 px-1 py-0.5 rounded">
                  F9
                </kbd>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* 3. MODALS & WORKFLOW DIALOGS */}

      {/* Held Invoices List Modal */}
      {dialog === "heldList" && (
        <Modal title="Held / Parked Bills" onClose={() => setDialog(null)} className="max-w-md">
          {heldInvoices.length > 0 ? (
            <div className="space-y-2.5">
              {heldInvoices.map((held) => {
                const heldCustomer = customers.find((c) => c.id === held.customerId);
                const heldTotalPaise = held.items.reduce(
                  (sum, item) => sum + item.quantitySqFt * item.unitPricePaise,
                  0,
                );
                return (
                  <div
                    key={held.id}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{held.reference}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {heldCustomer?.name || "Customer"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {held.items.length} items · {formatPkr(heldTotalPaise)}
                      </p>
                      {held.note && (
                        <p className="text-[11px] italic text-muted-foreground mt-0.5">
                          &quot;{held.note}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => resumeHeldInvoice(held)}
                        className="gap-1 text-xs font-semibold"
                      >
                        <PlayCircle className="size-3" /> Resume
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => discardHeldInvoice(held.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">No held bills right now.</p>
              <p className="text-xs mt-1">
                You can park sales when customers need more time.
              </p>
            </div>
          )}
        </Modal>
      )}

      {/* Save Hold Dialog */}
      {dialog === "hold" && (
        <Modal title="Hold Current Sale" onClose={() => setDialog(null)}>
          <p className="text-xs text-muted-foreground">
            Park this order to assist the next customer in line. You can resume it anytime from
            &quot;Held Bills&quot;.
          </p>
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-foreground">
              Optional Note / Customer Identifier
            </label>
            <Input
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              placeholder={`e.g. Waiting for cash / ${selectedCustomer.name}`}
              className="text-xs"
              autoFocus
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveHold} className="gap-1">
              <PauseCircle className="size-3.5" />
              Park Ticket (F8)
            </Button>
          </div>
        </Modal>
      )}

      {/* Add New Customer Dialog */}
      {dialog === "customer" && (
        <NewCustomerDialog
          onClose={() => setDialog(null)}
          onCreate={(c) => {
            setCustomers((prev) => [...prev, c]);
            setSelectedCustomerId(c.id);
            setDialog(null);
            toast.success(`Customer ${c.name} added and selected.`);
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {dialog === "shortcuts" && (
        <Modal title="Keyboard Shortcuts" onClose={() => setDialog(null)} className="max-w-md">
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Focus Barcode / Search</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono font-bold">
                / or F2
              </kbd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Quick Add from Search</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono font-bold">Enter</kbd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">New Fresh Sale</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono font-bold">F4</kbd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Park / Hold Ticket</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono font-bold">F8</kbd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Complete Sale / Pay</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono font-bold">F9</kbd>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-muted-foreground">Close Dialogs</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono font-bold">Esc</kbd>
            </div>
          </div>
        </Modal>
      )}

      {/* Sale Success / Receipt Modal */}
      {dialog === "success" && completedInvoice && (
        <InvoiceSuccessDialog
          invoice={completedInvoice}
          customer={selectedCustomer}
          products={products}
          onClose={() => setDialog(null)}
          onPrint={() => window.print()}
          onNewSale={startNewSale}
          onWhatsApp={() => window.open(whatsAppUrl, "_blank", "noopener,noreferrer")}
        />
      )}
    </div>
  );
}

function NewCustomerDialog({
  onClose,
  onCreate,
}: Readonly<{
  onClose: () => void;
  onCreate: (customer: PosCustomer) => void;
}>) {
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", gstNumber: "" },
  });

  return (
    <Modal title="Add New Customer" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit((values) =>
          onCreate({
            id: `customer-${crypto.randomUUID()}`,
            name: values.name,
            phone: values.phone,
            ...(values.email ? { email: values.email } : {}),
            ...(values.address ? { address: values.address } : {}),
            type: "RETAIL",
          }),
        )}
      >
        <div>
          <label className="text-xs font-semibold text-foreground">Customer Name *</label>
          <Input autoFocus {...form.register("name")} className="mt-1 h-9 text-xs" />
          {form.formState.errors.name && (
            <span className="text-[10px] text-destructive">
              {form.formState.errors.name.message}
            </span>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Phone Number *</label>
          <Input inputMode="tel" {...form.register("phone")} className="mt-1 h-9 text-xs" />
          {form.formState.errors.phone && (
            <span className="text-[10px] text-destructive">
              {form.formState.errors.phone.message}
            </span>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Email (Optional)</label>
          <Input type="email" {...form.register("email")} className="mt-1 h-9 text-xs" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceSuccessDialog({
  invoice,
  customer,
  products,
  onClose,
  onPrint,
  onNewSale,
  onWhatsApp,
}: Readonly<{
  invoice: CompletedInvoice;
  customer: PosCustomer;
  products: readonly PosProduct[];
  onClose: () => void;
  onPrint: () => void;
  onNewSale: () => void;
  onWhatsApp: () => void;
}>) {
  return (
    <Modal title="Sale Complete" onClose={onClose} className="max-w-lg">
      <div className="text-center pb-2">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500 animate-in zoom-in-75 duration-200" />
        <h3 className="mt-2 text-xl font-bold tracking-tight">Payment Recorded!</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Invoice #{invoice.invoiceNumber} · {formatDateTime(invoice.createdAt)}
        </p>
      </div>

      {/* Receipt Preview Slip */}
      <div className="rounded-xl border bg-muted/20 p-4 my-3 text-xs space-y-2">
        <div className="flex justify-between font-bold border-b pb-1.5">
          <span>{customer.name}</span>
          <span>{invoice.paymentMethod.replaceAll("_", " ")}</span>
        </div>

        <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
          {invoice.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return (
              <div key={item.productId} className="flex justify-between text-muted-foreground">
                <span className="truncate pr-2">
                  {product?.name || item.productId} × {item.quantitySqFt}
                </span>
                <span className="font-medium text-foreground">
                  {formatPkr(item.quantitySqFt * item.unitPricePaise)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPkr(invoice.subtotalPaise)}</span>
          </div>
          {invoice.discountPaise > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount</span>
              <span>-{formatPkr(invoice.discountPaise)}</span>
            </div>
          )}
          {invoice.taxPaise > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({invoice.taxRate}%)</span>
              <span>{formatPkr(invoice.taxPaise)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t">
            <span>Grand Total</span>
            <span>{formatPkr(invoice.grandTotalPaise)}</span>
          </div>

          {invoice.cashTenderedPaise !== undefined && invoice.changeDuePaise !== undefined && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg mt-1">
              <span>Cash Given: {formatPkr(invoice.cashTenderedPaise)}</span>
              <span>Change: {formatPkr(invoice.changeDuePaise)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
          <Printer className="size-3.5" />
          Print Receipt
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onWhatsApp}
          className="gap-1.5 text-emerald-600 hover:text-emerald-700"
        >
          <MessageCircle className="size-3.5" />
          WhatsApp Slip
        </Button>
        <Button
          className="col-span-2 bg-primary hover:bg-primary/90 h-10 font-bold gap-2 text-sm"
          onClick={onNewSale}
        >
          <Plus className="size-4" />
          Start Next Sale (Enter)
        </Button>
      </div>
    </Modal>
  );
}
