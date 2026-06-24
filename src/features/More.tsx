import { useCommunity, usePlans, useProducts } from '../hooks/queries';
import { int, price } from '../lib/format';
import { useCartStore } from '../state/cartStore';

/** "Mais" tab — plans + marketplace + community, loaded via TanStack queries. */
export function More() {
  const { data: plans = [] } = usePlans();
  const { data: products = [] } = useProducts();
  const { data: community = [] } = useCommunity();

  // Select raw items (stable ref) + the add action; derive the rest locally.
  const items = useCartStore((s) => s.items);
  const add = useCartStore((s) => s.add);
  const count = items.length;
  const total = items.reduce((sum, p) => sum + p.price, 0);
  const has = (id: string) => items.some((p) => p.id === id);

  return (
    <>
      {/* Planos */}
      <div className="card">
        <div className="card-title">Planos PlantAI</div>
        <div className="card-sub">Escolha o plano ideal para o seu jardim</div>
        <div className="plan-cards">
          {plans.map((plan) => (
            <div className={plan.featured ? 'plan-card featured' : 'plan-card'} key={plan.id}>
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                R$ {price(plan.price)}
                <span>{plan.period}</span>
              </div>
              <div className="plan-features">
                {plan.features.map((f) => (
                  <div className="pf-item" key={f}>
                    {f}
                  </div>
                ))}
              </div>
              <button className={plan.outlineCta ? 'plan-btn outline' : 'plan-btn'}>
                {plan.ctaLabel}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace */}
      <div className="card">
        <div className="card-title">Marketplace</div>
        <div className="card-sub">Produtos selecionados para o seu jardim</div>
        <div className="card-sub">
          Carrinho: {count} item(s) · R$ {price(total)}
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <div className="product-card" key={product.id}>
              <div className="prod-icon">{product.emoji}</div>
              <div className="prod-body">
                <div className="prod-name">{product.name}</div>
                <div className="prod-desc">{product.description}</div>
                <div className="prod-price">R$ {price(product.price)}</div>
              </div>
              <button
                className="prod-btn"
                onClick={() => add(product)}
                disabled={has(product.id)}
              >
                {has(product.id) ? 'Adicionado ✓' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comunidade */}
      <div className="card">
        <div className="card-title">Comunidade PlantAI</div>
        <div className="card-sub">Rankings dos jardins mais produtivos</div>
        <div className="rank-list">
          {community.map((entry) => (
            <div className="rank-item" key={entry.rank}>
              <div className={entry.medal ? 'rank-pos top' : 'rank-pos'}>
                {entry.medal || entry.rank}
              </div>
              <div className="rank-info">
                <div className="ri-name">{entry.name}</div>
                <div className="ri-detail">{entry.detail}</div>
              </div>
              <div className="rank-badge">R$ {int(entry.savings)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
