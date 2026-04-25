from sqlmodel import Session, create_engine, select, func
from backend.app.models import File, User, Job, StepMetric
from backend.app.crud import _real_files_filter

def test_filter():
    engine = create_engine("postgresql://root:root@db:5432/flaskai")
    with Session(engine) as session:
        # Check total records first
        total = session.exec(select(func.count(File.id))).one()
        print(f"Total files in DB: {total}")
        
        # Check sources
        sources = session.exec(select(File.source, func.count(File.id)).group_by(File.source)).all()
        print("Sources in DB:")
        for s, c in sources:
            print(f"  '{s}': {c}")
            
        # Check source_ids for source='system'
        system_sids = session.exec(
            select(File.source_id, func.count(File.id))
            .where(File.source == 'system')
            .group_by(File.source_id)
        ).all()
        print("Source IDs for source='system':")
        for sid, c in system_sids:
            print(f"  '{sid}': {c}")

        # Test the filter
        f = _real_files_filter()
        count = session.exec(select(func.count(File.id)).where(f)).one()
        print(f"Filtered files (source=None): {count}")
        
        f_system = _real_files_filter(source="system")
        count_system = session.exec(select(func.count(File.id)).where(f_system)).one()
        print(f"Filtered files (source='system'): {count_system}")

if __name__ == "__main__":
    try:
        test_filter()
    except Exception as e:
        print(f"Error: {e}")
