from fpdf import FPDF
from datetime import datetime
import os


class HandoverReport(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(220, 50, 50)
        self.cell(0, 10, 'AI TRIAGE SYSTEM', ln=True, align='C')
        self.set_text_color(0, 0, 0)
        self.set_font('Helvetica', '', 10)
        self.cell(0, 6, 'Shift Handover Report', ln=True, align='C')
        self.cell(0, 6, f"Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}", ln=True, align='C')
        self.ln(4)
        self.set_draw_color(220, 50, 50)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()} | Confidential — For clinical use only', align='C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_fill_color(240, 240, 240)
        self.cell(0, 8, f'  {title}', ln=True, fill=True)
        self.ln(2)

    def key_value(self, key, value, color=None):
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(80, 80, 80)
        self.cell(55, 6, key + ':', ln=False)
        self.set_font('Helvetica', '', 9)
        if color:
            self.set_text_color(*color)
        else:
            self.set_text_color(0, 0, 0)
        self.cell(0, 6, str(value), ln=True)
        self.set_text_color(0, 0, 0)


def generate_handover_report(queue: list, stats: dict, shift_info: dict) -> str:
    pdf = HandoverReport()
    pdf.add_page()

    # Shift Summary
    pdf.section_title('SHIFT SUMMARY')
    pdf.key_value('Shift Period', shift_info.get('period', 'Day Shift (08:00 - 20:00)'))
    pdf.key_value('Reporting Nurse', shift_info.get('nurse', 'Sr. Nurse on Duty'))
    pdf.key_value('Department', 'Emergency Department')
    pdf.ln(4)

    # Stats
    pdf.section_title('STATISTICS')
    pdf.key_value('Total Patients Triaged', str(stats.get('total', 0)))
    pdf.key_value('Immediate (Red)', str(stats.get('immediate', 0)), (220, 50, 50))
    pdf.key_value('Urgent (Orange)', str(stats.get('urgent', 0)), (234, 88, 12))
    pdf.key_value('Less Urgent (Yellow)', str(stats.get('less_urgent', 0)), (202, 138, 4))
    pdf.key_value('Non-Urgent (Green)', str(stats.get('non_urgent', 0)), (22, 163, 74))
    pdf.key_value('AI Overrides by Nurse', str(stats.get('overrides', 0)))
    pdf.key_value('Sepsis Flags Raised', str(stats.get('sepsis_flags', 0)))
    pdf.key_value('Mass Casualty Events', str(stats.get('mass_casualty', 0)))
    pdf.ln(4)

    # Patients Still in Queue
    if queue:
        pdf.section_title('PATIENTS STILL IN QUEUE (Handover Required)')
        colors = {0: (220,50,50), 1: (234,88,12), 2: (202,138,4), 3: (22,163,74)}
        labels = {0: 'IMMEDIATE', 1: 'URGENT', 2: 'LESS URGENT', 3: 'NON-URGENT'}

        for p in queue:
            ul = p.get('urgency_level', 3)
            pdf.set_font('Helvetica', 'B', 9)
            pdf.set_text_color(*colors.get(ul, (0,0,0)))
            pdf.cell(0, 6, f"[{labels.get(ul,'UNKNOWN')}] {p.get('name','Unknown')} — ID: {p.get('id','')}", ln=True)
            pdf.set_text_color(0,0,0)
            pdf.set_font('Helvetica', '', 8)
            pdf.cell(0, 5, f"  Age: {p.get('age','?')} | Complaint: {p.get('chief_complaint','?')} | Arrived: {p.get('arrival_time','?')}", ln=True)
            if p.get('sepsis_flag'):
                pdf.set_text_color(220,50,50)
                pdf.cell(0, 5, '  *** SEPSIS FLAG ACTIVE ***', ln=True)
                pdf.set_text_color(0,0,0)
            if p.get('overridden'):
                pdf.set_text_color(180,100,0)
                pdf.cell(0, 5, f"  Note: AI decision overridden — {p.get('override_reason','No reason given')}", ln=True)
                pdf.set_text_color(0,0,0)
            pdf.ln(2)
    else:
        pdf.section_title('QUEUE STATUS')
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(0, 8, 'No patients in queue at time of handover.', ln=True)

    # Recommendations
    pdf.ln(4)
    pdf.section_title('INCOMING SHIFT NOTES')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5,
        'Please review all patients marked URGENT or IMMEDIATE immediately upon assuming shift. '
        'All sepsis-flagged patients require blood culture and lactate results review. '
        'Any AI overrides should be clinically validated by incoming physician. '
        'Contact outgoing nurse for verbal handover of complex cases.'
    )

    os.makedirs('reports', exist_ok=True)
    filename = f"reports/handover_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    pdf.output(filename)
    return filename
