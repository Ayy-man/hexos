'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, X, Loader2, Building2, Mail, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { submitPayoutAction } from '@/features/finances/actions/payoutActions';
import type { PaymentPreference } from '@/lib/types/payouts';

interface Project {
  id: string;
  project_name: string;
  client_name: string;
}

interface SubmitPayoutFormProps {
  projects: Project[];
}

export function SubmitPayoutForm({ projects }: SubmitPayoutFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Form state
  const [projectId, setProjectId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  // Payment preference
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference>('wire_transfer');

  // Wire transfer details
  const [wireRecipientName, setWireRecipientName] = useState('');
  const [wireSwiftCode, setWireSwiftCode] = useState('');
  const [wireAccountNumber, setWireAccountNumber] = useState('');
  const [wireBankName, setWireBankName] = useState('');
  const [wireBankAddress, setWireBankAddress] = useState('');
  const [wireRecipientAddress, setWireRecipientAddress] = useState('');
  const [wireRecipientCountry, setWireRecipientCountry] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (JPG, PNG, WebP)');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setInvoiceFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate wire transfer details if wire_transfer selected
    if (paymentPreference === 'wire_transfer') {
      if (!wireRecipientName.trim()) {
        toast.error('Please enter recipient name');
        return;
      }
      if (!wireSwiftCode.trim()) {
        toast.error('Please enter SWIFT/BIC code');
        return;
      }
      if (!wireAccountNumber.trim()) {
        toast.error('Please enter IBAN or account number');
        return;
      }
      if (!wireBankName.trim()) {
        toast.error('Please enter bank name');
        return;
      }
      if (!wireRecipientCountry.trim()) {
        toast.error('Please enter recipient country');
        return;
      }
    }

    // Invoice file is optional for emailed_invoice preference
    if (paymentPreference === 'wire_transfer' && !invoiceFile) {
      toast.error('Please upload your invoice');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('project_id', projectId === 'none' ? '' : projectId || '');
    formData.append('description', description);
    formData.append('amount', amount);
    formData.append('invoice_number', invoiceNumber);
    formData.append('invoice_date', invoiceDate);
    formData.append('payment_preference', paymentPreference);

    if (invoiceFile) {
      formData.append('invoice_file', invoiceFile);
    }

    // Wire transfer details
    if (paymentPreference === 'wire_transfer') {
      formData.append('wire_recipient_name', wireRecipientName);
      formData.append('wire_swift_code', wireSwiftCode);
      formData.append('wire_account_number', wireAccountNumber);
      formData.append('wire_bank_name', wireBankName);
      formData.append('wire_bank_address', wireBankAddress);
      formData.append('wire_recipient_address', wireRecipientAddress);
      formData.append('wire_recipient_country', wireRecipientCountry);
    }

    const result = await submitPayoutAction(formData);

    if (result.success) {
      toast.success('Payout request submitted successfully');
      router.push('/dashboard/dev/payouts');
    } else {
      toast.error(result.error || 'Failed to submit payout request');
    }

    setLoading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Submit Payout Request</h1>
        <p className="text-muted-foreground">Request payment for your completed work</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only projects you&apos;re assigned to are shown
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Frontend development - January 2026"
                rows={2}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Payment Preference */}
            <div className="space-y-3">
              <Label>How would you like to receive payment? *</Label>
              <div className="grid gap-3">
                <div
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                    paymentPreference === 'wire_transfer'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                  onClick={() => setPaymentPreference('wire_transfer')}
                >
                  <div className="mt-0.5">
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border-2',
                        paymentPreference === 'wire_transfer'
                          ? 'border-primary'
                          : 'border-muted-foreground/50'
                      )}
                    >
                      {paymentPreference === 'wire_transfer' && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Wire Transfer</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Receive payment via international wire transfer (1-3 business days)
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                    paymentPreference === 'emailed_invoice'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                  onClick={() => setPaymentPreference('emailed_invoice')}
                >
                  <div className="mt-0.5">
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border-2',
                        paymentPreference === 'emailed_invoice'
                          ? 'border-primary'
                          : 'border-muted-foreground/50'
                      )}
                    >
                      {paymentPreference === 'emailed_invoice' && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">I&apos;ll email my invoice</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Email your invoice to us and we&apos;ll process payment (1-3 business days)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Wire Transfer Details */}
            {paymentPreference === 'wire_transfer' && (
              <div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Wire Transfer Details</span>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wire_recipient_name">Recipient Name *</Label>
                    <Input
                      id="wire_recipient_name"
                      value={wireRecipientName}
                      onChange={(e) => setWireRecipientName(e.target.value)}
                      placeholder="Full name as it appears on bank account"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wire_swift_code">SWIFT/BIC Code *</Label>
                      <Input
                        id="wire_swift_code"
                        value={wireSwiftCode}
                        onChange={(e) => setWireSwiftCode(e.target.value.toUpperCase())}
                        placeholder="e.g., HDFCINBB"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wire_account_number">IBAN / Account Number *</Label>
                      <Input
                        id="wire_account_number"
                        value={wireAccountNumber}
                        onChange={(e) => setWireAccountNumber(e.target.value)}
                        placeholder="IBAN or account number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wire_bank_name">Bank Name *</Label>
                      <Input
                        id="wire_bank_name"
                        value={wireBankName}
                        onChange={(e) => setWireBankName(e.target.value)}
                        placeholder="e.g., HDFC Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wire_recipient_country">Country *</Label>
                      <Input
                        id="wire_recipient_country"
                        value={wireRecipientCountry}
                        onChange={(e) => setWireRecipientCountry(e.target.value)}
                        placeholder="e.g., India"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wire_bank_address">Bank Address</Label>
                    <Input
                      id="wire_bank_address"
                      value={wireBankAddress}
                      onChange={(e) => setWireBankAddress(e.target.value)}
                      placeholder="Bank branch address (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wire_recipient_address">Your Address</Label>
                    <Input
                      id="wire_recipient_address"
                      value={wireRecipientAddress}
                      onChange={(e) => setWireRecipientAddress(e.target.value)}
                      placeholder="Your address (optional)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Invoice Instructions */}
            {paymentPreference === 'emailed_invoice' && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                  <div className="space-y-2">
                    <p className="font-medium text-blue-400">Email your invoice to:</p>
                    <p className="font-mono text-sm">ayman@hexonasystems.com</p>
                    <p className="text-sm text-muted-foreground">
                      Please include your name and this payout request description in the email.
                      Processing typically takes 1-3 business days after we receive your invoice.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Upload */}
            <div className="space-y-2">
              <Label>
                Your Invoice {paymentPreference === 'wire_transfer' ? '*' : '(optional)'}
              </Label>
              <div
                className={cn(
                  'relative rounded-lg border-2 border-dashed p-6 transition-colors',
                  dragActive && 'border-primary bg-primary/5',
                  invoiceFile && 'border-green-500 bg-green-500/5'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {invoiceFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium">{invoiceFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(invoiceFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setInvoiceFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center text-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop your invoice here or click to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g., INV-2026-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/dev/payouts')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
