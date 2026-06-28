import json
import os
import logging
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from backend.config import settings

logger = logging.getLogger("civicmind.database")

# In-Memory Mock Database for Zero-Config Fallback
class MockDocumentReference:
    def __init__(self, collection_name: str, doc_id: str, db_store: Dict[str, Dict[str, Any]]):
        self.collection_name = collection_name
        self.id = doc_id
        self._store = db_store

    def get(self):
        class MockDocumentSnapshot:
            def __init__(self, exists: bool, data: Dict[str, Any], doc_id: str):
                self.exists = exists
                self._data = data
                self.id = doc_id
            
            def to_dict(self) -> Optional[Dict[str, Any]]:
                return self._data if self.exists else None

        col_store = self._store.setdefault(self.collection_name, {})
        if self.id in col_store:
            # Return copy of the dict to prevent reference mutation issues
            return MockDocumentSnapshot(True, dict(col_store[self.id]), self.id)
        return MockDocumentSnapshot(False, {}, self.id)

    def set(self, data: Dict[str, Any], merge: bool = False):
        col_store = self._store.setdefault(self.collection_name, {})
        if merge and self.id in col_store:
            col_store[self.id].update(data)
        else:
            col_store[self.id] = dict(data)
            # Ensure ID is in document data
            col_store[self.id]["id"] = self.id
        logger.info(f"[MockDB] Set {self.collection_name}/{self.id}")

    def update(self, data: Dict[str, Any]):
        col_store = self._store.setdefault(self.collection_name, {})
        if self.id in col_store:
            col_store[self.id].update(data)
            logger.info(f"[MockDB] Updated {self.collection_name}/{self.id}")
        else:
            raise Exception(f"Document {self.collection_name}/{self.id} does not exist for update.")

    def delete(self):
        col_store = self._store.setdefault(self.collection_name, {})
        if self.id in col_store:
            del col_store[self.id]
            logger.info(f"[MockDB] Deleted {self.collection_name}/{self.id}")


class MockQuery:
    def __init__(self, collection_name: str, docs: List[Dict[str, Any]], filters: List[tuple] = None, order: List[tuple] = None):
        self.collection_name = collection_name
        self.docs = docs
        self.filters = filters or []
        self.order = order or []

    def where(self, field: str, op: str, value: Any):
        new_docs = []
        for doc in self.docs:
            val = doc
            for part in field.split("."):
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    val = None
                    break
            match = False
            if op == "==":
                match = (val == value)
            elif op == "!=":
                match = (val != value)
            elif op == ">":
                match = (val is not None and val > value)
            elif op == "<":
                match = (val is not None and val < value)
            elif op == ">=":
                match = (val is not None and val >= value)
            elif op == "<=":
                match = (val is not None and val <= value)
            elif op == "in":
                match = (val in value) if isinstance(value, list) else False
            elif op == "array_contains":
                match = (isinstance(val, list) and value in val)
            
            if match:
                new_docs.append(doc)
        return MockQuery(self.collection_name, new_docs, self.filters + [(field, op, value)], self.order)

    def order_by(self, field: str, direction: str = "ASCENDING"):
        descending = (direction == "DESCENDING")
        try:
            # Sort with handling for missing fields
            sorted_docs = sorted(
                self.docs, 
                key=lambda x: x.get(field) if x.get(field) is not None else "",
                reverse=descending
            )
            return MockQuery(self.collection_name, sorted_docs, self.filters, self.order + [(field, direction)])
        except Exception:
            return self

    def limit(self, count: int):
        return MockQuery(self.collection_name, self.docs[:count], self.filters, self.order)

    def stream(self):
        class MockDocumentSnapshot:
            def __init__(self, doc_data: Dict[str, Any]):
                self.id = doc_data.get("id") or doc_data.get("issueId") or doc_data.get("userId") or "unknown"
                self._data = doc_data
            
            def to_dict(self) -> Dict[str, Any]:
                return self._data

        return [MockDocumentSnapshot(doc) for doc in self.docs]


class MockCollectionReference:
    def __init__(self, name: str, db_store: Dict[str, Dict[str, Any]]):
        self.name = name
        self._store = db_store

    def document(self, doc_id: str) -> MockDocumentReference:
        return MockDocumentReference(self.name, doc_id, self._store)

    def add(self, data: Dict[str, Any]) -> tuple[Any, MockDocumentReference]:
        import uuid
        doc_id = str(uuid.uuid4())
        ref = self.document(doc_id)
        ref.set(data)
        return None, ref

    def _get_all_docs(self) -> List[Dict[str, Any]]:
        col_store = self._store.setdefault(self.name, {})
        # Ensure 'id' is populated in returning items
        for k, v in col_store.items():
            if "id" not in v:
                v["id"] = k
        return list(col_store.values())

    def where(self, field: str, op: str, value: Any) -> MockQuery:
        return MockQuery(self.name, self._get_all_docs()).where(field, op, value)

    def order_by(self, field: str, direction: str = "ASCENDING") -> MockQuery:
        return MockQuery(self.name, self._get_all_docs()).order_by(field, direction)

    def stream(self) -> List[Any]:
        return MockQuery(self.name, self._get_all_docs()).stream()


class MockFirestoreClient:
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        logger.warning("Initializing Mock Firestore Client. All database actions will be volatile (in-memory).")

    def collection(self, name: str) -> MockCollectionReference:
        return MockCollectionReference(name, self._store)


# Database client initialization
db = None
is_mock_db = True

try:
    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        is_mock_db = False
        logger.info("Firebase Firestore successfully initialized using credentials file.")
    elif os.getenv("FIREBASE_CREDENTIALS_JSON"):
        # Allow loading straight from JSON env string
        cred_json = json.loads(os.getenv("FIREBASE_CREDENTIALS_JSON"))
        cred = credentials.Certificate(cred_json)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        is_mock_db = False
        logger.info("Firebase Firestore successfully initialized using credentials JSON string.")
    else:
        db = MockFirestoreClient()
        is_mock_db = True
except Exception as e:
    logger.error(f"Error initializing real Firestore: {e}. Falling back to Mock Firestore.")
    db = MockFirestoreClient()
    is_mock_db = True

def get_db():
    return db
