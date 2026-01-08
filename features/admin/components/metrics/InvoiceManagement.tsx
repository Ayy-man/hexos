import {
  FileText,
  Plus,
  MoreHorizontal,
  Send,
  ExternalLink,
  Ban,
  Trash,
  Download,
  Copy,
  User,
  Receipt,
  Calendar,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

// ... (keep existing imports)

// ... (keep component logic)

return (
  <>
    <Card>
      {/* ... (keep existing Card content) ... */}
    </Card>

    {/* Add/Edit Invoice Sheet */}
    <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl px-0 sm:px-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>
              {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
            </SheetTitle>
            <SheetDescription>
              {editingInvoice
                ? 'Update invoice details'
                : 'Create a new invoice for a client'}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="grid gap-6 py-6">
              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Client Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      placeholder="John Doe"
                      value={formData.client_name}
                      onChange={(e) =>
                        setFormData({ ...formData, client_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_email">Client Email *</Label>
                    <Input
                      id="client_email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.client_email}
                      onChange={(e) =>
                        setFormData({ ...formData, client_email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_company">Company</Label>
                    <Input
                      id="client_company"
                      placeholder="Acme Inc."
                      value={formData.client_company}
                      onChange={(e) =>
                        setFormData({ ...formData, client_company: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={formData.project_id || 'none'}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          project_id: v === 'none' ? '' : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Line Items
                </h3>
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start py-2 p-3 bg-muted/30 rounded-md border border-border/50 group hover:border-border transition-colors">
                      <div className="grid gap-2 flex-1">
                        <Input
                          placeholder="Description"
                          className="bg-background"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(index, 'description', e.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Qty"
                            className="w-20 bg-background"
                            value={item.quantity}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                'quantity',
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              className="pl-6 bg-background"
                              value={item.unit_price || ''}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  'unit_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm font-medium pt-2 w-20 text-right">
                          {formatCurrency((item.quantity * item.unit_price))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                    className="w-full border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line Item
                  </Button>
                </div>
              </div>

              {/* Totals Box */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal / 100)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tax Rate</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      className="w-16 h-7 text-right bg-background"
                      value={formData.tax_rate * 100 || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tax_rate: (parseFloat(e.target.value) || 0) / 100,
                        })
                      }
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Amount</span>
                    <span>{formatCurrency(taxAmount / 100)}</span>
                  </div>
                )}
                <Separator className="bg-border/50" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Due</span>
                  <span className="text-primary">{formatCurrency(total / 100)}</span>
                </div>
              </div>

              <Separator />

              {/* Due Date & Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Dates & Notes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes for the invoice..."
                    className="min-h-[100px]"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="px-6 py-4 border-t bg-muted/20">
            <div className="flex justify-between w-full items-center">
              <div>
                {editingInvoice && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(editingInvoice.id)}
                    disabled={isSubmitting}
                    size="sm"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Invoice
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Saving...'
                    : editingInvoice
                      ? 'Update Invoice'
                      : 'Create Invoice'}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  </>
);
}
