import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Search, Trash2, AlertTriangle } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "./pagination";
import { CreateProduct } from "./create-product";

export function ProductList() {
  const { products, productsPag, setProductsPage, productsSearch, setProductsSearch, deleteProduct } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Product
        </Button>
      </div>

      {showCreate && <CreateProduct onClose={() => setShowCreate(false)} />}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products..." value={productsSearch} onInput={(e) => setProductsSearch((e.target as HTMLInputElement).value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-24">Brand</TableHead>
                <TableHead className="w-24">Category</TableHead>
                <TableHead className="w-20 text-right">Price</TableHead>
                <TableHead className="w-16 text-right">Cost</TableHead>
                <TableHead className="w-20 text-center">Stock</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No products found</TableCell></TableRow>
              )}
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{p.brand || "—"}</TableCell>
                  <TableCell>
                    {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-medium">${p.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">${p.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      {p.stock <= p.low_stock_alert && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className={p.stock <= p.low_stock_alert ? "font-medium text-amber-600" : ""}>{p.stock}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination pag={productsPag} setPage={setProductsPage} />
    </div>
  );
}
