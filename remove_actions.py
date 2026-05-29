import re

with open('services/notary.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Count before
before_count = len(re.findall(r'<div class="nt-card__actions">', content))
print(f"Occurrences before: {before_count}")

# Remove all nt-card__actions blocks (non-greedy, DOTALL)
new_content, n = re.subn(
    r'\s*<div class="nt-card__actions">.*?</div>',
    '',
    content,
    flags=re.DOTALL
)

print(f"Blocks removed: {n}")

# Count after
after_count = len(re.findall(r'nt-card__actions', new_content))
print(f"Occurrences after: {after_count}")

with open('services/notary.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done.")
