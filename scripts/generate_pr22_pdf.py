#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[1]
INPUT_MD = ROOT / 'docs' / 'pr-22-explicacao-alteracoes.md'
OUTPUT_PDF = ROOT / 'docs' / 'pr-22-explicacao-alteracoes.pdf'


def register_fonts() -> tuple[str, str]:
    regular = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

    if Path(regular).exists() and Path(bold).exists():
        pdfmetrics.registerFont(TTFont('DejaVuSans', regular))
        pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', bold))
        return 'DejaVuSans', 'DejaVuSans-Bold'

    return 'Helvetica', 'Helvetica-Bold'


def make_styles(font_name: str, font_bold: str):
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name='BodyPT',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10.5,
            leading=14,
            spaceAfter=6,
        )
    )

    styles.add(
        ParagraphStyle(
            name='H1PT',
            parent=styles['Heading1'],
            fontName=font_bold,
            fontSize=18,
            leading=22,
            spaceAfter=10,
            textColor=colors.HexColor('#172133'),
        )
    )

    styles.add(
        ParagraphStyle(
            name='H2PT',
            parent=styles['Heading2'],
            fontName=font_bold,
            fontSize=14,
            leading=18,
            spaceBefore=8,
            spaceAfter=8,
            textColor=colors.HexColor('#172133'),
        )
    )

    styles.add(
        ParagraphStyle(
            name='H3PT',
            parent=styles['Heading3'],
            fontName=font_bold,
            fontSize=12,
            leading=16,
            spaceBefore=8,
            spaceAfter=6,
            textColor=colors.HexColor('#172133'),
        )
    )

    styles.add(
        ParagraphStyle(
            name='H4PT',
            parent=styles['Heading4'],
            fontName=font_bold,
            fontSize=11,
            leading=14,
            spaceBefore=6,
            spaceAfter=4,
            textColor=colors.HexColor('#374151'),
        )
    )

    styles.add(
        ParagraphStyle(
            name='BulletPT',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10.5,
            leading=14,
            leftIndent=14,
            bulletIndent=2,
            spaceAfter=4,
        )
    )

    return styles


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor('#6b7280'))
    canvas.drawRightString(A4[0] - 2 * cm, 1.4 * cm, f'Página {doc.page}')
    canvas.restoreState()


def markdown_to_story(text: str, styles):
    story = []
    first_h2_seen = False

    for raw_line in text.splitlines():
        line = raw_line.rstrip()

        if not line.strip():
            story.append(Spacer(1, 0.15 * cm))
            continue

        if line.startswith('# '):
            story.append(Paragraph(line[2:].strip(), styles['H1PT']))
            story.append(HRFlowable(width='100%', thickness=0.6, color=colors.HexColor('#e5e7eb')))
            story.append(Spacer(1, 0.2 * cm))
            continue

        if line.startswith('## '):
            if first_h2_seen:
                story.append(PageBreak())
            first_h2_seen = True
            story.append(Paragraph(line[3:].strip(), styles['H2PT']))
            continue

        if line.startswith('### '):
            story.append(Paragraph(line[4:].strip(), styles['H3PT']))
            continue

        if line.startswith('#### '):
            story.append(Paragraph(line[5:].strip(), styles['H4PT']))
            continue

        if line.startswith('- '):
            story.append(Paragraph(line[2:].strip(), styles['BulletPT'], bulletText='•'))
            continue

        story.append(Paragraph(line, styles['BodyPT']))

    return story


def main() -> None:
    if not INPUT_MD.exists():
        raise FileNotFoundError(f'Arquivo fonte não encontrado: {INPUT_MD}')

    font_name, font_bold = register_fonts()
    styles = make_styles(font_name, font_bold)

    source_text = INPUT_MD.read_text(encoding='utf-8')
    source_text = source_text.replace(
        '{{GEN_DATE}}', datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    )

    story = markdown_to_story(source_text, styles)

    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title='PR #22 - Explicação das alterações',
        author='GitHub Copilot Coding Agent',
        subject='Documentação técnica das alterações do PR #22',
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

    print(f'PDF gerado em: {OUTPUT_PDF}')


if __name__ == '__main__':
    main()
