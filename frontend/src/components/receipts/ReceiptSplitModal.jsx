import React, { useState, useMemo, useEffect } from 'react';
import {
  BiCamera,
  BiUpload,
  BiCheck,
  BiX,
  BiTrash,
  BiPlus,
  BiReceipt,
  BiRestaurant,
  BiCalculator,
  BiShieldQuarter,
  BiEdit,
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import './ReceiptSplitModal.css';

export default function ReceiptSplitModal({
  isOpen,
  onClose,
  group,
  currentUser,
  onExpenseCreated,
}) {
  if (!isOpen || !group) return null;

  // Normalize members to a clean array of string names
  const memberNames = useMemo(() => {
    if (!group || !group.members) return [];
    return group.members
      .map((m) => (typeof m === 'object' && m !== null ? m.name || m.username || 'Member' : String(m || '')))
      .filter(Boolean);
  }, [group]);

  const defaultPayer = useMemo(() => {
    const currentName = currentUser?.full_name || currentUser?.display_name || currentUser?.username || '';
    return (
      memberNames.find((m) => m.toLowerCase() === currentName.toLowerCase()) ||
      memberNames[0] ||
      ''
    );
  }, [memberNames, currentUser]);

  const [step, setStep] = useState('upload'); // 'upload' | 'scanning' | 'split'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parsed Receipt State
  const [merchantName, setMerchantName] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paidBy, setPaidBy] = useState(defaultPayer);

  // Keep paidBy synced when defaultPayer is calculated
  useEffect(() => {
    if (defaultPayer && (!paidBy || !memberNames.includes(paidBy))) {
      setPaidBy(defaultPayer);
    }
  }, [defaultPayer, paidBy, memberNames]);

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // Skip photo and jump straight to manual itemization table
  const handleSkipToManual = () => {
    if (!merchantName) setMerchantName('Restaurant Dining');
    if (items.length === 0) {
      setItems([
        { id: 'item-1', name: 'Item 1', price: '', assignedMembers: [...memberNames] },
      ]);
    }
    setStep('split');
  };

  // Trigger OCR API
  const handleStartScan = async () => {
    if (!selectedFile) {
      toast.error('Please select an image or PDF of the receipt.');
      return;
    }

    setStep('scanning');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/api/receipts/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resData = response.data?.data;
      if (!resData) throw new Error('Could not parse receipt data.');

      setMerchantName(resData.merchant_name || 'Restaurant Dining');
      setReceiptDate(resData.receipt_date || new Date().toISOString().split('T')[0]);
      setTax(parseFloat(resData.tax) || 0);
      setServiceCharge(parseFloat(resData.service_charge) || 0);
      setDiscount(parseFloat(resData.discount) || 0);

      // Pre-assign all members to each item by default for quick editing
      const initialItems = (resData.items || []).map((itm, idx) => ({
        id: itm.id || `item-${idx + 1}`,
        name: itm.name || `Item ${idx + 1}`,
        price: parseFloat(itm.price) || 0,
        assignedMembers: [...memberNames], // default: shared by everyone
      }));

      if (initialItems.length === 0) {
        initialItems.push({
          id: 'item-1',
          name: 'Food & Drinks Bill',
          price: parseFloat(resData.grand_total) || 0,
          assignedMembers: [...memberNames],
        });
      }

      setItems(initialItems);
      setStep('split');
      toast.success('Receipt scanned successfully!');
    } catch (err) {
      console.error('OCR Error:', err);
      toast.error(err.response?.data?.detail || 'Failed to scan receipt. You can manually enter items.');
      // Provide fallback editable sheet
      setMerchantName('Restaurant Bill');
      setItems([
        { id: 'item-1', name: 'Bill Total', price: 0, assignedMembers: [...memberNames] },
      ]);
      setStep('split');
    }
  };

  // Item assignment toggle
  const toggleMemberForItem = (itemId, memberName) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.assignedMembers.includes(memberName);
        const nextMembers = exists
          ? item.assignedMembers.filter((m) => m !== memberName)
          : [...item.assignedMembers, memberName];
        return { ...item, assignedMembers: nextMembers };
      })
    );
  };

  // Select all members for an item
  const selectAllMembersForItem = (itemId) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const allSelected = item.assignedMembers.length === memberNames.length;
        return {
          ...item,
          assignedMembers: allSelected ? [] : [...memberNames],
        };
      })
    );
  };

  // Add custom manual item
  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      name: `Item ${items.length + 1}`,
      price: '',
      assignedMembers: [...memberNames],
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete item
  const handleDeleteItem = (itemId) => {
    if (items.length <= 1) {
      toast.error('Bill must contain at least one item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Update item field
  const handleUpdateItem = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    );
  };

  // ── Proportional Tax and Split Engine ──
  const { memberCalculations, foodSubtotal, calculatedGrandTotal } = useMemo(() => {
    // 1. Calculate food share for each member
    const memberFoodMap = {};
    memberNames.forEach((m) => {
      memberFoodMap[m] = 0;
    });

    let totalFood = 0;
    items.forEach((item) => {
      const price = parseFloat(item.price) || 0;
      totalFood += price;

      const assigned = item.assignedMembers.length > 0 ? item.assignedMembers : memberNames;
      const share = price / Math.max(1, assigned.length);

      assigned.forEach((m) => {
        if (memberFoodMap[m] !== undefined) {
          memberFoodMap[m] += share;
        }
      });
    });

    const parsedTax = parseFloat(tax) || 0;
    const parsedServiceCharge = parseFloat(serviceCharge) || 0;
    const parsedDiscount = parseFloat(discount) || 0;
    const totalExtraFees = parsedTax + parsedServiceCharge - parsedDiscount;
    const grandTotal = Math.max(0, totalFood + totalExtraFees);

    // 2. Distribute taxes and extra charges proportionally
    const calcs = memberNames.map((m) => {
      const individualFood = memberFoodMap[m] || 0;
      const proportion = totalFood > 0 ? individualFood / totalFood : 1 / Math.max(1, memberNames.length);

      const memberTax = proportion * parsedTax;
      const memberService = proportion * parsedServiceCharge;
      const memberDisc = proportion * parsedDiscount;
      const memberTotal = Math.max(0, individualFood + memberTax + memberService - memberDisc);

      return {
        member: m,
        foodShare: individualFood,
        taxShare: memberTax,
        serviceShare: memberService,
        discountShare: memberDisc,
        finalAmount: Math.round(memberTotal * 100) / 100,
      };
    });

    // Ensure cents balance
    const sumCents = calcs.reduce((acc, c) => acc + c.finalAmount, 0);
    const roundingDiff = Math.round((grandTotal - sumCents) * 100) / 100;
    if (Math.abs(roundingDiff) > 0 && calcs.length > 0) {
      calcs[0].finalAmount = Math.round((calcs[0].finalAmount + roundingDiff) * 100) / 100;
    }

    return {
      memberCalculations: calcs,
      foodSubtotal: totalFood,
      calculatedGrandTotal: grandTotal,
    };
  }, [items, tax, serviceCharge, discount, memberNames]);

  // Submit and Create Group Expense
  const handleCreateGroupExpense = async () => {
    if (!merchantName.trim()) {
      toast.error('Please specify a merchant or restaurant name.');
      return;
    }
    if (calculatedGrandTotal <= 0) {
      toast.error('Grand total must be greater than 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const splits = memberCalculations.map((c) => ({
        user_name: c.member,
        amount: c.finalAmount,
      }));

      // Generate descriptive breakdown note
      const itemizedSummary = items
        .map((i) => `${i.name} (₹${i.price}): ${i.assignedMembers.join(', ')}`)
        .join(' | ');

      const expensePayload = {
        description: `🍽️ ${merchantName}`,
        amount: Math.round(calculatedGrandTotal * 100) / 100,
        currency: 'INR',
        category: 'food',
        paid_by: paidBy || defaultPayer,
        split_type: 'exact',
        splits: splits,
        notes: `Smart Receipt Itemized Split: ${itemizedSummary}. Taxes: ₹${tax}, Service: ₹${serviceCharge}`,
      };

      const response = await api.post(`/api/groups/${group.id}/expenses`, expensePayload);

      toast.success('Itemized receipt expense logged successfully!');
      if (onExpenseCreated) onExpenseCreated(response.data);
      onClose();
    } catch (err) {
      console.error('Error logging itemized expense:', err);
      toast.error(err.response?.data?.detail || 'Failed to create group expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="receipt-modal-header">
          <div className="header-badge-row">
            <span className="cyber-glow-badge">
              <BiRestaurant /> SMART DINING SPLITTER
            </span>
            <button className="close-btn" onClick={onClose}>
              <BiX />
            </button>
          </div>
          <h2>Itemized Receipt OCR & Splitter</h2>
          <p className="subtitle">
            Scan your restaurant bill with Divvy AI. Assign individual dishes to group
            members with automated proportional tax distribution.
          </p>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="receipt-step-upload">
            <div className="upload-dropzone">
              <input
                type="file"
                id="receipt-file-input"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="file-hidden-input"
              />
              <label htmlFor="receipt-file-input" className="dropzone-label">
                {imagePreview ? (
                  <div className="preview-container">
                    <img src={imagePreview} alt="Receipt preview" className="receipt-preview-img" />
                    <div className="change-img-overlay">
                      <BiCamera /> Change Receipt Image
                    </div>
                  </div>
                ) : (
                  <div className="dropzone-empty">
                    <div className="dropzone-icon">
                      <BiCamera />
                    </div>
                    <span className="dropzone-title">Click or Drag & Drop Bill Photo</span>
                    <span className="dropzone-hint">Supports JPEG, PNG, WebP, and PDF invoices</span>
                  </div>
                )}
              </label>
            </div>

            {selectedFile && (
              <div className="selected-file-meta">
                <span>📄 {selectedFile.name}</span>
                <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            )}

            <div className="manual-entry-quicklink">
              <span>Don't have a receipt photo?</span>
              <button type="button" onClick={handleSkipToManual} className="manual-link-btn">
                ✍️ Skip & Enter Items Manually
              </button>
            </div>

            <div className="modal-actions-footer">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                icon={BiEdit}
                onClick={handleSkipToManual}
                title="Skip photo upload and manually enter items"
              >
                ✍️ Itemize Manually
              </Button>
              <Button
                variant="primary"
                icon={BiShieldQuarter}
                onClick={handleStartScan}
                disabled={!selectedFile}
              >
                Scan with Divvy AI
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNING ANIMATION */}
        {step === 'scanning' && (
          <div className="receipt-step-scanning">
            <div className="scanning-radar-box">
              <div className="laser-scanner-line"></div>
              {imagePreview ? (
                <img src={imagePreview} alt="Scanning" className="scanning-img" />
              ) : (
                <BiReceipt className="scanning-icon-large" />
              )}
            </div>
            <h3>Extracting Bill Items & Taxes...</h3>
            <p>Divvy AI is analyzing items, prices, CGST/SGST, and service charges.</p>
            <div className="scanner-spinner-row">
              <Spinner size="md" />
            </div>
          </div>
        )}

        {/* STEP 3: INTERACTIVE REVIEW & SPLIT */}
        {step === 'split' && (
          <div className="receipt-step-split">
            {/* Header info */}
            <div className="bill-meta-bar">
              <div className="meta-field">
                <label>Restaurant / Merchant</label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Social, Toit, Pizza Hut"
                  className="cyber-input"
                />
              </div>
              <div className="meta-field">
                <label>Bill Date</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="cyber-input"
                />
              </div>
              <div className="meta-field">
                <label>Paid By</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="cyber-input cyber-select"
                >
                  {memberNames.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === (currentUser?.display_name || currentUser?.full_name) ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="items-table-container">
              <div className="items-table-header">
                <span className="col-desc">Item Description</span>
                <span className="col-members">Shared By Members</span>
                <span className="col-price">Price (₹)</span>
                <span className="col-actions"></span>
              </div>

              <div className="items-table-body">
                {items.map((item) => {
                  const itemPrice = parseFloat(item.price) || 0;
                  const sharePerPerson =
                    item.assignedMembers.length > 0
                      ? itemPrice / item.assignedMembers.length
                      : itemPrice;

                  return (
                    <div key={item.id} className="item-row">
                      <div className="col-desc">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="item-name-input"
                        />
                      </div>

                      <div className="col-members">
                        <div className="member-chips-selector">
                          <button
                            type="button"
                            className={`chip-btn ${item.assignedMembers.length === memberNames.length ? 'chip-active' : ''}`}
                            onClick={() => selectAllMembersForItem(item.id)}
                            title="Toggle all members"
                          >
                            All
                          </button>
                          {memberNames.map((m) => {
                            const isAssigned = item.assignedMembers.includes(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                className={`chip-btn ${isAssigned ? 'chip-active' : ''}`}
                                onClick={() => toggleMemberForItem(item.id, m)}
                              >
                                {isAssigned && <BiCheck className="chip-check" />}
                                {m}
                              </button>
                            );
                          })}
                        </div>
                        <span className="item-share-hint">
                          {item.assignedMembers.length > 0 ? (
                            <>
                              ₹{sharePerPerson.toFixed(2)}/person ({item.assignedMembers.length}{' '}
                              members)
                            </>
                          ) : (
                            <span className="warn-unassigned">No one selected (shared by all)</span>
                          )}
                        </span>
                      </div>

                      <div className="col-price">
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="item-price-input"
                        />
                      </div>

                      <div className="col-actions">
                        <button
                          type="button"
                          className="item-delete-btn"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Remove item"
                        >
                          <BiTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="items-table-footer">
                <button type="button" className="add-item-row-btn" onClick={handleAddItem}>
                  <BiPlus /> Add Item
                </button>
                <div className="food-subtotal-tag">
                  Food Subtotal: <strong>₹{foodSubtotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Taxes, Service Charges & Proportional Distribution */}
            <div className="taxes-summary-grid">
              <div className="tax-inputs-card">
                <h4>
                  <BiCalculator /> Taxes & Surcharges
                </h4>
                <div className="tax-fields-row">
                  <div className="tax-field">
                    <label>Total Tax (GST/VAT)</label>
                    <div className="input-prefix-box">
                      <span>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="tax-field">
                    <label>Service Charge / Fee</label>
                    <div className="input-prefix-box">
                      <span>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={serviceCharge}
                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="tax-field">
                    <label>Discount / Round-off</label>
                    <div className="input-prefix-box">
                      <span>-₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
                <p className="tax-note">
                  💡 Taxes and service fees are automatically distributed proportionally based on each
                  member's food order value.
                </p>
              </div>

              {/* Calculated Split Breakdown Card */}
              <div className="split-breakdown-card">
                <div className="breakdown-header">
                  <h4>Live Member Breakdown</h4>
                  <div className="grand-total-badge">
                    Total: ₹{calculatedGrandTotal.toFixed(2)}
                  </div>
                </div>
                <div className="breakdown-members-list">
                  {memberCalculations.map((c) => (
                    <div key={c.member} className="breakdown-member-row">
                      <div className="breakdown-col-name">
                        <span className="member-name">{c.member}</span>
                        <span className="member-sub-calc">
                          Food: ₹{c.foodShare.toFixed(2)} + Tax: ₹{c.taxShare.toFixed(2)}
                        </span>
                      </div>
                      <div className="breakdown-col-val">
                        <span className="final-owed-pill">₹{c.finalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="modal-actions-footer">
              <Button variant="outline" onClick={() => setStep('upload')}>
                ← Back
              </Button>
              <Button
                variant="primary"
                icon={BiCheck}
                onClick={handleCreateGroupExpense}
                loading={isSubmitting}
              >
                Log Itemized Expense (₹{calculatedGrandTotal.toFixed(2)})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
