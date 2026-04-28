import gzip
with gzip.open('datasets/step_metrics.sql.gz', 'rt', encoding='utf-8', errors='replace') as f:
    content = f.read().replace('\x00', '')
statements = content.split('\nINSERT INTO "public"."step_metrics"')
print(len(statements))
