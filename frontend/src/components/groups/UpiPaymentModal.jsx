import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BiCheckCircle,
  BiCopy,
  BiCheck,
  BiMobileAlt,
  BiQrScan,
  BiCreditCard,
  BiEdit,
} from 'react-icons/bi';
import { RiWhatsappFill } from 'react-icons/ri';
import { HiSparkles, HiShieldCheck } from 'react-icons/hi';
import Modal from '../common/Modal';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import './UpiPaymentModal.css';

export default function UpiPaymentModal({
  isOpen,
  onClose,
  debtorName,
  creditorName,
  amount = 0,
  groupName = 'Group',
  creditorUpiId: initialCreditorUpiId = '',
  onRecordSettlement,
}) {
  const [upiId, setUpiId] = useState(initialCreditorUpiId || '');
  const [isEditingUpi, setIsEditingUpi] = useState(!initialCreditorUpiId);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncToPersonal, setSyncToPersonal] = useState(true);

  // Sync initial UPI ID when opened
  useEffect(() => {
    if (initialCreditorUpiId) {
      setUpiId(initialCreditorUpiId);
      setIsEditingUpi(false);
    } else {
      // Fallback format guess or prompt to enter
      const sanitizedName = (creditorName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
      const stored = localStorage.getItem(`divvy_upi_${sanitizedName}`);
      if (stored) {
        setUpiId(stored);
        setIsEditingUpi(false);
      } else {
        setUpiId(`${sanitizedName}@okhdfcbank`);
        setIsEditingUpi(true);
      }
    }
  }, [initialCreditorUpiId, creditorName, isOpen]);

  // Construct official NPCI standard UPI Intent URI
  const noteText = `Divvy - ${groupName} Settlement`;
  const cleanAmount = Number(amount || 0).toFixed(2);
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent(creditorName || 'User')}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(noteText)}`;

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId.trim());
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpiId(true);
    toast.success(`Copied ${upiId}`);
    setTimeout(() => setCopiedUpiId(false), 2000);
  };

  const getPayUrl = () => {
    const origin = window.location.origin;
    return `${origin}/pay?group=${encodeURIComponent(groupName)}&from=${encodeURIComponent(debtorName)}&to=${encodeURIComponent(creditorName)}&amount=${cleanAmount}${upiId ? `&upiId=${encodeURIComponent(upiId.trim())}` : ''}`;
  };

  const handleCopyLink = () => {
    const payUrl = getPayUrl();
    navigator.clipboard.writeText(payUrl);
    setCopiedLink(true);
    toast.success('Web Payment Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenPayPage = () => {
    const payUrl = getPayUrl();
    window.open(payUrl, '_blank');
  };

  const handleShareWhatsApp = () => {
    const formattedAmt = parseFloat(cleanAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const payUrl = getPayUrl();
    const message = `👋 Hey *${debtorName}*!\n\nOn Divvy for *${groupName}*, you have an outstanding balance to settle with *${creditorName}*:\n\n💰 *Amount to pay:* ₹${formattedAmt}\n👤 *Pay To:* ${creditorName}\n\n👉 *Tap here to pay directly via Google Pay / PhonePe / Paytm:*\n${payUrl}\n\n(Zero app download required. Opens your native UPI payment app with 1 tap!)`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleSaveUpi = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!upiId.trim()) {
      toast.error('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
      return;
    }
    const sanitizedName = (creditorName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    localStorage.setItem(`divvy_upi_${sanitizedName}`, upiId.trim());
    setIsEditingUpi(false);
    toast.success(`Updated UPI ID for ${creditorName}`);
  };

  const handleConfirmSettlement = async () => {
    setSubmitting(true);
    try {
      if (onRecordSettlement) {
        await onRecordSettlement({
          debtorName,
          creditorName,
          amount: parseFloat(cleanAmount),
          upiId: upiId.trim(),
          syncToPersonal,
        });
      }
      toast.success(`🎉 Settlement of ₹${cleanAmount} marked as paid!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ 1-Tap UPI Settlement & QR Code"
      size="md"
    >
      <div className="upi-modal-body">
        {/* Subheader info chip */}
        <div className="upi-ai-badge">
          <HiSparkles className="sparkle-icon" />
          <span>Zero Fees • Instant P2P Bank Settlement via NPCI UPI</span>
        </div>

        {/* Hero Amount Strip */}
        <div className="upi-hero-amount-card">
          <div className="upi-hero-direction">
            <span className="debtor-badge">{debtorName}</span>
            <span className="arrow-text">pays</span>
            <span className="creditor-badge">{creditorName}</span>
          </div>
          <div className="upi-hero-price font-mono">
            ₹{parseFloat(cleanAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="upi-hero-group">{noteText}</span>
        </div>

        {/* Recipient UPI ID Section */}
        <div className="upi-id-box">
          <div className="upi-id-header">
            <label className="upi-id-label">
              <BiCreditCard /> {creditorName}'s UPI VPA
            </label>
            <button
              type="button"
              className="edit-upi-btn"
              onClick={() => setIsEditingUpi(!isEditingUpi)}
            >
              <BiEdit /> {isEditingUpi ? 'Done' : 'Change'}
            </button>
          </div>

          {isEditingUpi ? (
            <form onSubmit={handleSaveUpi} className="upi-edit-form">
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                className="upi-edit-input"
                autoFocus
              />
              <Button type="submit" variant="primary" size="sm">
                Save
              </Button>
            </form>
          ) : (
            <div className="upi-id-display-row">
              <span className="upi-id-val font-mono">{upiId}</span>
              <button
                type="button"
                className="copy-icon-btn"
                onClick={handleCopyUpi}
                title="Copy UPI ID"
              >
                {copiedUpi ? <BiCheck className="text-success" /> : <BiCopy />}
              </button>
            </div>
          )}
        </div>

        {/* Dynamic QR Code Display */}
        <div className="upi-qr-card">
          <div className="qr-wrapper">
            <QRCodeSVG
              value={upiUri}
              size={185}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0a0a14"
            />
          </div>
          <p className="qr-caption">
            <BiQrScan /> Scan with <strong>Google Pay, PhonePe, Paytm, or CRED</strong>
          </p>
        </div>

        {/* Mobile / Web 1-Tap Redirection Launch Button */}
        <div className="mobile-upi-launch">
          <button
            type="button"
            className="upi-launch-btn"
            onClick={handleOpenPayPage}
            style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <BiMobileAlt className="launch-icon" />
            <span>⚡ Open 1-Tap Payment Page (/pay)</span>
          </button>
        </div>

        {/* WhatsApp P2P Share Button */}
        <div className="whatsapp-request-block">
          <button
            type="button"
            className="upi-whatsapp-btn"
            onClick={handleShareWhatsApp}
            title="Send prefilled UPI payment request to debtor on WhatsApp"
          >
            <RiWhatsappFill className="whatsapp-btn-icon" />
            <span>📲 Send Payment Request on WhatsApp</span>
          </button>
        </div>

        {/* Copy Deep Link Helper */}
        <div className="upi-secondary-actions">
          <button type="button" className="text-action-link" onClick={handleCopyLink}>
            {copiedLink ? '✓ Copied UPI URI' : '🔗 Copy UPI Payment Link'}
          </button>
        </div>

        {/* Settlement Confirmation Box */}
        <div className="settlement-confirm-card">
          <div className="confirm-icon-row">
            <HiShieldCheck className="shield-check" />
            <div>
              <h5>Already sent the money?</h5>
              <p>Click below to eliminate this debt from Divvy's balance matrix.</p>
            </div>
          </div>

          <label className="sync-personal-checkbox-label">
            <input
              type="checkbox"
              checked={syncToPersonal}
              onChange={(e) => setSyncToPersonal(e.target.checked)}
            />
            <span>📊 Auto-add this payment to my Personal Expenses tracker</span>
          </label>

          <Button
            variant="primary"
            icon={BiCheckCircle}
            fullWidth
            onClick={handleConfirmSettlement}
            loading={submitting}
          >
            Record as Settled in Divvy
          </Button>
        </div>
      </div>
    </Modal>
  );
}
