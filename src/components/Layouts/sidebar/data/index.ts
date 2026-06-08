import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MENU PRINCIPAL",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "Produtos",
        url: "/produtos",
        icon: Icons.PackageIcon,
        items: [],
      },
      {
        title: "Categorias",
        url: "/categorias",
        icon: Icons.TagIcon,
        items: [],
      },
      {
        title: "Fornecedores",
        url: "/fornecedores",
        icon: Icons.TruckIcon,
        items: [],
      },
      {
        title: "Pedidos",
        url: "/pedidos",
        icon: Icons.ShoppingCartIcon,
        items: [],
      },
      {
        title: "Precificação",
        url: "/precos",
        icon: Icons.ClipboardIcon,
        items: [],
      },
      {
        title: "Sync Bling",
        url: "/sync",
        icon: Icons.RefreshIcon,
        items: [],
      },
    ],
  },
  {
    label: "CONFIGURAÇÕES",
    items: [
      {
        title: "Configurações",
        icon: Icons.SettingsIcon,
        items: [
          { title: "Políticas de Custo", url: "/configuracoes/custo" },
          { title: "Políticas de Preço", url: "/configuracoes/precificacao" },
        ],
      },
    ],
  },
];
