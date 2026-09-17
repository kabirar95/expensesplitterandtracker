import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_executive_pitch_docx(filename="DIVVY_EXECUTIVE_PITCH.docx"):
    doc = docx.Document()

    # Set page margins (0.75 inch)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Color Palette: Slate & Crimson Luxury
    C_PRIMARY = RGBColor(225, 29, 72)     # Crimson Rose #e11d48
    C_DARK = RGBColor(15, 23, 42)         # Deep Slate #0f172a
    C_SLATE = RGBColor(71, 85, 105)       # Slate Gray #475569
    C_ACCENT = RGBColor(124, 58, 237)     # Electric Violet #7c3aed

    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = C_DARK
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    # Header Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("DIVVY: AUTONOMOUS SOCIAL FINANCE & ZERO-APP SETTLEMENT ENGINE")
    run_title.font.size = Pt(16)
    run_title.font.bold = True
    run_title.font.color.rgb = C_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(8)
    run_sub = p_sub.add_run("Master Pitch & Architectural Blueprint | Next-Gen P2P Splitter & Personal Wealth Ecosystem")
    run_sub.font.size = Pt(9.5)
    run_sub.font.bold = True
    run_sub.font.color.rgb = C_SLATE

    # The 10-Line Hook Callout
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(7.0)

    cell = table.cell(0, 0)
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="FFF1F2"/>')
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="E11D48"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(shd)
    tcPr.append(borders)

    p_hook = cell.paragraphs[0]
    p_hook.paragraph_format.space_before = Pt(3)
    p_hook.paragraph_format.space_after = Pt(3)
    r_h1 = p_hook.add_run("THE 10-LINE HOOK: WHY DIVVY STOPS JUDGES COLD\n")
    r_h1.font.bold = True
    r_h1.font.size = Pt(10.5)
    r_h1.font.color.rgb = C_PRIMARY

    hook_text = (
        "Every group expense app built in the last decade suffers from the 'Walled Garden Paradox': if you create a group on Splitwise, all 7 friends must download the app, register accounts, and calculate who owes whom—only to switch to GPay or PhonePe to manually type UPI IDs, settle debts off-platform, and lose all personal budget tracking.\n"
        "Divvy shatters this friction forever through Zero-App P2P Settlement. Snap a photo of a ₹6,400 restaurant bill: Divvy's vision OCR extracts every dish and tax, collapses 15 tangled debts into just 2 payments via Min-Cash-Flow algorithms, and lets you tap 'WhatsApp Ping'. Your friend—who does not even have Divvy installed—receives a verified WhatsApp notification with an embedded NPCI UPI intent deep link. One tap opens their GPay/PhonePe with the exact ₹850 and payee preloaded; they authenticate with fingerprint, and the debt settles in 4 seconds. Divvy instantly syncs that payment into the payer's personal wealth ledger. It is not just an expense splitter; it is the autonomous operating system for shared financial life."
    )
    r_ht = p_hook.add_run(hook_text)
    r_ht.font.size = Pt(9)
    r_ht.font.italic = True
    r_ht.font.color.rgb = C_DARK

    def add_sec(title, color=C_PRIMARY):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(7)
        h.paragraph_format.space_after = Pt(2)
        r = h.add_run(title)
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = color
        return h

    # Section 1
    add_sec("1. THE PROBLEM: ONBOARDING FRICTION & DISCONNECTED WEALTH")
    doc.add_paragraph(
        "Social finance is broken across three dimensions: (1) App Fatigue: Asking friends to install an 80MB app to split ₹300 creates friction, causing organizers to shoulder unpaid debts indefinitely. (2) Data Isolation: Group settlement payments vanish into thin air without ever updating your personal monthly budget or savings rate. (3) Receipt Headaches: Dividing multi-item bills, service taxes, and foreign currencies requires tedious manual math."
    )

    # Section 2
    add_sec("2. WHAT WE HAVE BUILT: THE LIVE PRODUCTION PLATFORM")
    doc.add_paragraph(
        "Divvy is fully engineered and running live on FastAPI, React 18, Supabase PostgreSQL, and Google Gemini AI:"
    )

    built_bullets = [
        ("Zero-App WhatsApp UPI Deep Linking:", " Debtors receive an interactive WhatsApp ping containing an NPCI UPI Intent URI (upi://pay?pa=...&am=...). Tapping it directly opens Google Pay, PhonePe, or Paytm with the receiver and exact amount preloaded—requiring zero app installation for the debtor."),
        ("Min-Cash-Flow Debt Simplification:", " A graph optimization algorithm computes net positions across N members, collapsing complex multi-person IOUs into the absolute mathematical minimum number of payments."),
        ("Dual-Ledger Auto-Sync:", " Settling a group debt automatically logs that payment into the user's personal wealth tracker under the correct budget category (Food, Travel, Rent), keeping savings goals accurate in real time."),
        ("Vision OCR Itemized Dining Splitter:", " Neural bill extraction parses line items, tips, and GST from receipts, letting friends claim individual dishes with 1 click."),
        ("Bank Statement Forensic Importer (PDF/CSV):", " Automatically parses bank statements across HDFC, SBI, ICICI, etc., equipped with hash deduplication to eliminate repeated transactions."),
        ("Live Multi-Currency FX Engine:", " Dynamic real-time exchange rates (USD, EUR, GBP, AED, INR) with cached fallbacks for seamless international vacation splitting."),
        ("Gemini AI Copilot:", " Natural language expense logging ('Dinner with Rahul 1200'), predictive burn-rate warnings, and automated weekly email digests.")
    ]
    for b_title, b_desc in built_bullets:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.15)
        p.paragraph_format.space_after = Pt(2)
        rt = p.add_run("• " + b_title)
        rt.font.bold = True
        rd = p.add_run(b_desc)
        rd.font.color.rgb = C_SLATE

    # Section 3
    add_sec("3. WHAT WE PLAN ON BUILDING: THE AUTONOMOUS ROADMAP")
    doc.add_paragraph("Our vision elevates Divvy from a reactive tool into an ambient, automated financial ecosystem:")

    plan_bullets = [
        ("RBI Account Aggregator (AA) Auto-Sync:", " Direct integration with licensed Account Aggregators (Setu/OneMoney) for continuous, consent-driven bank transaction streaming without manual file uploads."),
        ("Conversational WhatsApp Group Bot:", " Add the Divvy bot to any WhatsApp group. Simply messaging '@Divvy split 1800 for dinner equally' logs the bill, calculates shares, and posts interactive 1-tap UPI payment buttons in chat."),
        ("Split-to-Invest 'Round-Up' Micro-Wealth:", " When settling debts, members can round up payments to the nearest ₹10 or ₹50, automatically investing spare change into Digital Gold or Liquid Mutual Funds."),
        ("Smart Escrow Travel Vaults:", " Programmatic group pools where members pre-fund vacations into secure escrow, dishing out funds upon group approval.")
    ]
    for b_title, b_desc in plan_bullets:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.15)
        p.paragraph_format.space_after = Pt(2)
        rt = p.add_run("• " + b_title)
        rt.font.bold = True
        rt.font.color.rgb = C_ACCENT
        rd = p.add_run(b_desc)
        rd.font.color.rgb = C_SLATE

    # Section 4
    add_sec("4. THE WINNING EDGE: WHY DIVVY WINS")
    doc.add_paragraph(
        "Competitors try to force viral downloads by trapping users behind paywalls and mandatory signups. Divvy acknowledges human psychology: zero friction wins. By allowing non-users to settle via WhatsApp in 4 seconds while empowering organizers with bank-grade intelligence and OCR, Divvy captures viral adoption from day one."
    )

    doc.save(filename)
    print(f"File {filename} successfully written.")

if __name__ == "__main__":
    create_executive_pitch_docx()
