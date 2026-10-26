"""Local launcher must provision and validate the persisted worker identity."""
import contextlib
import io
import os
from pathlib import Path
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import MagicMock, patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'local-gateway.py'


class LauncherActorTests(unittest.TestCase):
    def launch(self, actor):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            script = root / 'scripts' / 'local-gateway.py'
            script.parent.mkdir()
            script.write_text(SCRIPT.read_text())
            backend = root / 'backend'
            (backend / 'gateway').mkdir(parents=True)
            (backend / 'gateway' / 'app.py').touch()
            connection = MagicMock()
            connection.execute.return_value.fetchone.return_value = actor
            db = MagicMock()
            db.connect.return_value.__enter__.return_value = connection
            keys = MagicMock()
            keys.mint.return_value = ('test-key', types.SimpleNamespace(key_id='test'))
            server = MagicMock()
            modules = {
                'checker': types.ModuleType('checker'),
                'checker.env': types.SimpleNamespace(load=lambda: None),
                'gateway': types.ModuleType('gateway'),
                'gateway.app': types.SimpleNamespace(create_app=MagicMock()),
                'gateway.auth': types.SimpleNamespace(KeyStore=lambda: keys),
                'gateway.jobs': types.SimpleNamespace(PostgresQueue=MagicMock()),
                'psycopg': db, 'uvicorn': server,
            }
            with patch.dict(sys.modules, modules), patch.dict(os.environ, {
                'PLACEDON_BACKEND': str(backend), 'PLACEDON_DATABASE_URL': 'test',
                'PLACEDON_LOCAL_QUEUE': '1',
            }), patch('os.chdir'), contextlib.redirect_stdout(io.StringIO()):
                old_path = sys.path[:]
                try:
                    try:
                        runpy.run_path(str(script), run_name='__main__')
                        failure = None
                    except SystemExit as exc:
                        failure = str(exc)
                finally:
                    sys.path[:] = old_path
            return failure, connection, keys, server, (root / '.env.local').exists()

    def test_active_lawyer_starts_and_new_actor_is_provisioned_as_lawyer(self):
        failure, connection, keys, server, written = self.launch(('lawyer', None))
        self.assertIsNone(failure)
        sql = [call.args[0] for call in connection.execute.call_args_list]
        insert = next(s for s in sql if 'INSERT INTO actors' in s)
        self.assertIn("'lawyer'", insert)
        self.assertIn('ON CONFLICT DO NOTHING', insert)
        self.assertTrue(written)
        keys.mint.assert_called_once()
        server.run.assert_called_once()

    def test_existing_unprivileged_disabled_or_missing_actor_does_not_start(self):
        for actor in [('viewer', None), ('lawyer', 'disabled'), None]:
            with self.subTest(actor=actor):
                failure, connection, keys, server, written = self.launch(actor)
                self.assertIn('startup will not change', failure)
                keys.mint.assert_not_called()
                server.run.assert_not_called()
                self.assertFalse(written)
                self.assertFalse(any('UPDATE actors' in c.args[0]
                                     for c in connection.execute.call_args_list))


if __name__ == '__main__':
    unittest.main()
