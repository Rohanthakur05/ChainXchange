import React, { useState, useCallback } from 'react';
import { X, CreditCard, Building2, Smartphone, Shield, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { useWallet } from '../../../context/WalletContext';
import api from '../../../utils/api';
import styles from './AddMoneyModal.module.css';

const STEPS = ['Amount', 'Payment Method', 'Details', 'Confirm'];

const QUICK_AMOUNTS = [100, 500, 1000, 2500, 5000, 10000];

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', icon: Smartphone, description: 'Pay using UPI ID' },
    { id: 'card', label: 'Card', icon: CreditCard, description: 'Debit or Credit Card' },
    { id: 'bank', label: 'Bank Transfer', icon: Building2, description: 'NEFT / IMPS' }
];

// Detect card brand from number
const getCardBrand = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    if (/^(?:2131|1800|35)/.test(cleaned)) return 'JCB';
    return null;
};

// Format card number with spaces
const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

// Format expiry as MM/YY
const formatExpiry = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
};

const AddMoneyModal = ({ isOpen, onClose }) => {
    const { wallet, syncWallet } = useWallet();

    // Wizard state
    const [step, setStep] = useState(0);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(null);

    // Form states per payment method
    const [upiId, setUpiId] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardName, setCardName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankHolder, setBankHolder] = useState('');

    // Transaction state
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [errorMessage, setErrorMessage] = useState('');

    // Reset modal state
    const resetModal = useCallback(() => {
        setStep(0);
        setAmount('');
        setPaymentMethod(null);
        setUpiId('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setCardName('');
        setBankAccount('');
        setBankIfsc('');
        setBankName('');
        setBankHolder('');
        setStatus('idle');
        setErrorMessage('');
    }, []);

    const handleClose = () => {
        resetModal();
        onClose();
    };

    // Validation
    const validateAmount = () => {
        const num = parseFloat(amount);
        return !isNaN(num) && num >= 1 && num <= 100000;
    };

    const validateUpi = () => /^[\w.-]+@[\w]+$/.test(upiId);

    const validateCard = () => {
        const numClean = cardNumber.replace(/\s/g, '');
        return numClean.length >= 13 && numClean.length <= 16 &&
            /^\d{2}\/\d{2}$/.test(cardExpiry) &&
            cardCvv.length >= 3 &&
            cardName.trim().length > 0;
    };

    const validateBank = () => {
        return bankAccount.length >= 8 &&
            /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bankIfsc) &&
            bankHolder.trim().length > 0;
    };

    const canProceed = () => {
        switch (step) {
            case 0: return validateAmount();
            case 1: return paymentMethod !== null;
            case 2:
                if (paymentMethod === 'upi') return validateUpi();
                if (paymentMethod === 'card') return validateCard();
                if (paymentMethod === 'bank') return validateBank();
                return false;
            case 3: return true;
            default: return false;
        }
    };

    // Submit payment
    const handleSubmit = async () => {
        setStatus('processing');
        setErrorMessage('');

        try {
            const payload = {
                amount: parseFloat(amount),
                paymentMethod,
                ...(paymentMethod === 'upi' && { upiId }),
                ...(paymentMethod === 'card' && {
                    cardNumber: cardNumber.replace(/\s/g, ''),
                    cardExpiry,
                    cardCvv,
                    cardHolder: cardName
                }),
                ...(paymentMethod === 'bank' && {
                    bankAccount,
                    bankIfsc,
                    bankName,
                    bankHolder
                })
            };

            await api.post('/payment/add-money', payload);

            // Sync wallet to update balance everywhere
            await syncWallet();

            setStatus('success');

            // Auto-close after success
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.response?.data?.error || 'Payment failed. Please try again.');
        }
    };

    if (!isOpen) return null;

    const cardBrand = getCardBrand(cardNumber);

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2>Add Money to Wallet</h2>
                    <button className={styles.closeBtn} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className={styles.stepIndicator}>
                    {STEPS.map((label, i) => (
                        <div
                            key={label}
                            className={`${styles.step} ${i <= step ? styles.active : ''} ${i < step ? styles.completed : ''}`}
                        >
                            <div className={styles.stepCircle}>
                                {i < step ? <Check size={14} /> : i + 1}
                            </div>
                            <span className={styles.stepLabel}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Step 0: Amount */}
                    {step === 0 && (
                        <div className={styles.stepContent}>
                            <div className={styles.currentBalance}>
                                Current Balance: <strong>${wallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <label className={styles.inputLabel}>Enter Amount (USD)</label>
                            <div className={styles.amountInputWrapper}>
                                <span className={styles.currencySymbol}>$</span>
                                <input
                                    type="number"
                                    className={styles.amountInput}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="1"
                                    max="100000"
                                />
                            </div>
                            <div className={styles.quickAmounts}>
                                {QUICK_AMOUNTS.map((amt) => (
                                    <button
                                        key={amt}
                                        className={`${styles.quickBtn} ${parseFloat(amount) === amt ? styles.selected : ''}`}
                                        onClick={() => setAmount(String(amt))}
                                    >
                                        ${amt.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                            {amount && !validateAmount() && (
                                <p className={styles.error}>Amount must be between $1 and $100,000</p>
                            )}
                        </div>
                    )}

                    {/* Step 1: Payment Method */}
                    {step === 1 && (
                        <div className={styles.stepContent}>
                            <label className={styles.inputLabel}>Select Payment Method</label>
                            <div className={styles.methodGrid}>
                                {PAYMENT_METHODS.map((method) => (
                                    <button
                                        key={method.id}
                                        className={`${styles.methodCard} ${paymentMethod === method.id ? styles.selected : ''}`}
                                        onClick={() => setPaymentMethod(method.id)}
                                    >
                                        <method.icon size={24} />
                                        <span className={styles.methodLabel}>{method.label}</span>
                                        <span className={styles.methodDesc}>{method.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Payment Details */}
                    {step === 2 && (
                        <div className={styles.stepContent}>
                            {paymentMethod === 'upi' && (
                                <>
                                    <label className={styles.inputLabel}>UPI ID</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="yourname@upi"
                                    />
                                    {upiId && !validateUpi() && (
                                        <p className={styles.error}>Enter valid UPI ID (e.g., name@upi)</p>
                                    )}
                                </>
                            )}

                            {paymentMethod === 'card' && (
                                <>
                                    <label className={styles.inputLabel}>
                                        Card Number
                                        {cardBrand && <span className={styles.cardBrand}>{cardBrand}</span>}
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        placeholder="1234 5678 9012 3456"
                                    />
                                    <div className={styles.row}>
                                        <div className={styles.col}>
                                            <label className={styles.inputLabel}>Expiry</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                                placeholder="MM/YY"
                                            />
                                        </div>
                                        <div className={styles.col}>
                                            <label className={styles.inputLabel}>CVV</label>
                                            <input
                                                type="password"
                                                className={styles.input}
                                                value={cardCvv}
                                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                placeholder="***"
                                            />
                                        </div>
                                    </div>
                                    <label className={styles.inputLabel}>Cardholder Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value)}
                                        placeholder="Name on card"
                                    />
                                </>
                            )}

                            {paymentMethod === 'bank' && (
                                <>
                                    <label className={styles.inputLabel}>Account Number</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={bankAccount}
                                        onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Account number"
                                    />
                                    <label className={styles.inputLabel}>IFSC Code</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={bankIfsc}
                                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                                        placeholder="ABCD0123456"
                                    />
                                    {bankIfsc && !(/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bankIfsc)) && (
                                        <p className={styles.error}>Invalid IFSC format</p>
                                    )}
                                    <label className={styles.inputLabel}>Bank Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="e.g., HDFC Bank"
                                    />
                                    <label className={styles.inputLabel}>Account Holder Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={bankHolder}
                                        onChange={(e) => setBankHolder(e.target.value)}
                                        placeholder="Name as per bank records"
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <div className={styles.stepContent}>
                            {status === 'idle' && (
                                <>
                                    <div className={styles.summary}>
                                        <div className={styles.summaryRow}>
                                            <span>Amount</span>
                                            <strong>${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                        </div>
                                        <div className={styles.summaryRow}>
                                            <span>Payment Method</span>
                                            <strong>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</strong>
                                        </div>
                                        {paymentMethod === 'upi' && (
                                            <div className={styles.summaryRow}>
                                                <span>UPI ID</span>
                                                <strong>{upiId}</strong>
                                            </div>
                                        )}
                                        {paymentMethod === 'card' && (
                                            <div className={styles.summaryRow}>
                                                <span>Card</span>
                                                <strong>**** {cardNumber.slice(-4)} ({cardBrand})</strong>
                                            </div>
                                        )}
                                        {paymentMethod === 'bank' && (
                                            <div className={styles.summaryRow}>
                                                <span>Account</span>
                                                <strong>****{bankAccount.slice(-4)}</strong>
                                            </div>
                                        )}
                                        <div className={styles.divider} />
                                        <div className={styles.summaryRow}>
                                            <span>Amount to Credit</span>
                                            <strong className={styles.creditAmount}>${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                        </div>
                                    </div>
                                    <div className={styles.trustBadge}>
                                        <Shield size={16} />
                                        <span>Secure & Encrypted Transaction</span>
                                    </div>
                                </>
                            )}

                            {status === 'processing' && (
                                <div className={styles.statusDisplay}>
                                    <Loader2 size={48} className={styles.spinner} />
                                    <p>Processing payment...</p>
                                </div>
                            )}

                            {status === 'success' && (
                                <div className={styles.statusDisplay}>
                                    <div className={styles.successIcon}>
                                        <Check size={32} />
                                    </div>
                                    <p className={styles.successText}>Payment Successful!</p>
                                    <p className={styles.successSubtext}>${parseFloat(amount).toLocaleString()} added to wallet</p>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className={styles.statusDisplay}>
                                    <p className={styles.errorText}>{errorMessage}</p>
                                    <button className={styles.retryBtn} onClick={() => setStatus('idle')}>
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {status === 'idle' && (
                    <div className={styles.footer}>
                        {step > 0 && (
                            <button className={styles.backBtn} onClick={() => setStep(step - 1)}>
                                <ChevronLeft size={18} />
                                Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                className={styles.nextBtn}
                                onClick={() => setStep(step + 1)}
                                disabled={!canProceed()}
                            >
                                Continue
                                <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                className={styles.submitBtn}
                                onClick={handleSubmit}
                                disabled={status !== 'idle'}
                            >
                                Add ${parseFloat(amount).toLocaleString()}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddMoneyModal;
