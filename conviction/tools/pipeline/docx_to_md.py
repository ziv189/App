#!/usr/bin/env python3
"""Convert a CONVICTION .docx (story bible or Director's Script) to Markdown and verify it.

Keeps headings, bullet and numbered lists, block quotes, and **bold** / _italic_ runs.
Verification compares the exact word sequence of the .docx with the Markdown (markup
stripped). With --script it also checks that every numbered scene heading, the refusal
beat and the secret ending are present.

Usage:
    docx_to_md.py SOURCE.docx DEST.md [--script]

Exits non-zero if any check fails.
"""
import argparse
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
SCENE_IDS = [str(n) for n in range(1, 43)] + ['15A', '22A', '22B', '38A']


def load(path):
    z = zipfile.ZipFile(path)
    doc = ET.fromstring(z.read('word/document.xml'))
    num = ET.fromstring(z.read('word/numbering.xml'))
    abstract_fmt = {a.get(W + 'abstractNumId'): a.find(W + 'lvl').find(W + 'numFmt').get(W + 'val')
                    for a in num.iter(W + 'abstractNum')}
    num_fmt = {n.get(W + 'numId'): abstract_fmt[n.find(W + 'abstractNumId').get(W + 'val')]
               for n in num.iter(W + 'num')}
    return doc, num_fmt


def run_text(run):
    parts = []
    for node in run:
        tag = node.tag[len(W):]
        if tag == 't':
            parts.append(node.text or '')
        elif tag == 'tab':
            parts.append('\t')
        elif tag in ('br', 'cr'):
            parts.append('  \n')
    return ''.join(parts)


def flag(rpr, name):
    el = rpr.find(W + name) if rpr is not None else None
    return el is not None and el.get(W + 'val') not in ('0', 'false')


def inline_md(paragraph):
    """Paragraph text with **bold** / _italic_, merging adjacent runs that share formatting."""
    spans = []
    for run in paragraph.iter(W + 'r'):
        text = run_text(run)
        if not text:
            continue
        rpr = run.find(W + 'rPr')
        fmt = (flag(rpr, 'b'), flag(rpr, 'i'))
        if spans and spans[-1][1] == fmt:
            spans[-1][0] += text
        else:
            spans.append([text, fmt])
    out = []
    for text, (bold, italic) in spans:
        core = text.strip()
        if not core:
            out.append(text)
            continue
        # Markers must hug the text, so surrounding whitespace stays outside them.
        lead = text[:len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        if italic:
            core = f'_{core}_'
        if bold:
            core = f'**{core}**'
        out.append(lead + core + trail)
    return ''.join(out)


def plain(paragraph):
    return ''.join(run_text(r) for r in paragraph.iter(W + 'r'))


def convert(path):
    doc, num_fmt = load(path)
    lines, counters, in_list = [], {}, False
    for p in doc.find(W + 'body'):
        if p.tag != W + 'p':
            continue
        ppr = p.find(W + 'pPr')
        style, num_id = '', None
        if ppr is not None:
            s = ppr.find(W + 'pStyle')
            style = s.get(W + 'val') if s is not None else ''
            n = ppr.find(W + 'numPr')
            if n is not None:
                num_id = n.find(W + 'numId').get(W + 'val')
        text = inline_md(p).strip()
        if not text:
            continue
        if style.startswith('Heading'):
            lines.append('#' * int(style[len('Heading'):]) + ' ' + plain(p).strip())
        elif num_id is not None:
            if num_fmt.get(num_id) == 'decimal':
                counters[num_id] = counters.get(num_id, 0) + 1
                marker = f'{counters[num_id]}.'
            else:
                marker = '-'
            if not in_list:
                lines.append('')
            lines.append(f'{marker} {text}')
            in_list = True
            continue
        elif style == 'Quote':
            lines.append('> ' + text)
        else:
            lines.append(text)
        in_list = False
        lines.append('')
    return '\n'.join(lines).strip() + '\n', doc


def words(text):
    return re.findall(r"[A-Za-z0-9']+", text)


def markdown_words(md):
    stripped = []
    for line in md.splitlines():
        if line.startswith('#'):
            line = line.lstrip('#')
        elif line.startswith('> '):
            line = line[2:]
        else:
            line = re.sub(r'^(-|\d+\.)\s', '', line)  # list markers only on list lines
        stripped.append(re.sub(r'\*\*|(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])', '', line))
    return words('\n'.join(stripped))


def verify(md, doc, is_script):
    """Return (report_lines, ok)."""
    report, ok = [], True
    src_words = words('\n'.join(plain(p) for p in doc.iter(W + 'p')))
    md_words = markdown_words(md)
    same = src_words == md_words
    ok &= same
    report.append(f'- Words: .docx {len(src_words)}, Markdown {len(md_words)}; identical sequence: {"yes" if same else "NO"}')
    if is_script:
        heads = re.findall(r'^### (\d+[A-Z]?)\. ', md, flags=re.M)
        missing = [h for h in SCENE_IDS if h not in heads]
        dupes = sorted({h for h in heads if heads.count(h) > 1})
        extra = [h for h in heads if h not in SCENE_IDS]
        ok &= not (missing or dupes or extra)
        report.append(f'- Numbered scene headings: {len(heads)} of {len(SCENE_IDS)}; '
                      f'missing {missing or "none"}; duplicates {dupes or "none"}; unexpected {extra or "none"}')
        for title in ('Alternate beat: refusing to pin', 'Secret ending'):
            present = bool(re.search(rf'^## {re.escape(title)}', md, flags=re.M))
            ok &= present
            report.append(f'- "{title}" section present: {"yes" if present else "NO"}')
    return report, ok


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('source')
    ap.add_argument('dest')
    ap.add_argument('--script', action='store_true', help="also run the Director's Script structure checks")
    args = ap.parse_args()
    md, doc = convert(args.source)
    with open(args.dest, 'w') as f:
        f.write(md)
    report, ok = verify(md, doc, args.script)
    print('\n'.join(report))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
