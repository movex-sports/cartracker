import os
import psycopg2
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL, sslmode="require", connect_timeout=10)


@app.route("/api/relatorios/recentes")
def relatorios_recentes():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                nome,
                inicio_do_relatorio
            FROM public.relatorio
            WHERE nome IS NOT NULL
            ORDER BY relatorio_number DESC
            LIMIT 10;
        """)

        linhas = cur.fetchall()

        dados = [
            {
                "nome_relatorio": nome,
                "data": inicio.strftime("%d/%m/%Y") if inicio else "",
            }
            for nome, inicio in linhas
        ]

        return jsonify(dados)

    finally:
        cur.close()
        conn.close()


@app.route("/health")
def health():
    return {"status": "ok"}, 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)
