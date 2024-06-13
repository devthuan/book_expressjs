const slug = require("slug");
const fs = require("fs");
const path = require("path");
const productModel = require("../../models/product");
const categoryModel = require("../../models/category");
const pagination = require("../../../common/pagination");

const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = page * limit - limit;
  const total = await productModel.find();
  const totalPages = Math.ceil(total.length / limit);
  const next = page + 1;
  const prev = page - 1;
  const hasNext = page < totalPages ? true : false;
  const hasPrev = page > 1 ? true : false;
  const products = await productModel
    .find()
    .sort({ _id: -1 })
    .populate("cat_id")
    .skip(skip)
    .limit(limit);
  const productRemove = await productModel.countWithDeleted({
    deleted: true,
  });
  res.render("admin/products/product", {
    products,
    productRemove,
    page,
    next,
    hasNext,
    prev,
    hasPrev,
    pages: pagination(page, totalPages),
  });
};

const trash = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = page * limit - limit;
  const total = await productModel.findWithDeleted({
    deleted: true,
  });
  const totalPages = Math.ceil(total.length / limit);
  const next = page + 1;
  const prev = page - 1;
  const hasNext = page < totalPages ? true : false;
  const hasPrev = page > 1 ? true : false;
  const products = await productModel
    .findWithDeleted({
      deleted: true,
    })
    .sort({ _id: -1 })
    .populate({ path: "cat_id" })
    .skip(skip)
    .limit(limit);
  res.render("admin/products/trash", {
    products,
    page,
    totalPages,
    next,
    hasNext,
    prev,
    hasPrev,
    pages: pagination(page, totalPages),
  });
};

const create = async (req, res) => {
  let error = "";
  const categories = await categoryModel.find();
  res.render("admin/products/add_product", { categories, error });
};

const store = async (req, res) => {
  const {
    name,
    price,
    sale,
    author,
    translator,
    promotion,
    details,
    cat_id,
    quantity,
    description,
  } = req.body;
  const { file } = req;
  let error = "";

  //kiem tra xem san pham da ton tai chua
  const products = await productModel.findOne({
    slug: slug(name),
  });
  const product = {
    name,
    price,
    sale,
    author,
    translator,
    details,
    promotion,
    cat_id,
    quantity,
    description,
    slug: slug(name),
  };

  if (product.sale <= 100) {
    product.salePrice = product.price - (product.sale * product.price) / 100;
  } else {
    product.salePrice = product.price - product.sale;
  }

  if (products) {
    error = "Tên sản phẩm đã tồn tại !";
  } else if (file) {
    const thumbnail = "products/" + file.originalname;
    fs.renameSync(file.path, path.resolve("src/public/images", thumbnail));
    product["thumbnail"] = thumbnail;
    await productModel.create(product);
    req.flash("success", "Thêm thành công !");
    res.redirect("/admin/product");
  }
  res.render("admin/products/add_product", { error });
};

const edit = async (req, res) => {
  const id = req.params.id;
  let error = "";
  const products = await productModel.findById(id);
  const categories = await categoryModel.find();
  res.render("admin/products/edit_product", { products, categories, error });
};

const update = async (req, res) => {
  const id = req.params.id;
  const {
    name,
    price,
    sale,
    author,
    translator,
    promotion,
    details,
    cat_id,
    quantity,
    description,
  } = req.body;
  const { file } = req;
  let error = "";

  //kiem tra xem san pham co cap nhat khong
  const products = await productModel.findOne({
    _id: req.params.id,
  });

  const product = {
    name,
    price,
    sale,
    author,
    translator,
    details,
    promotion,
    cat_id,
    quantity,
    description,
    slug: slug(name),
  };

  if (product.name !== products.name) {
    //kiem tra xem san pham da ton tai chua
    const isCheck = await productModel.findOne({
      slug: slug(name),
    });

    if (isCheck) {
      error = "Tên sản phẩm đã tồn tại !";
      return res.render("admin/products/edit_product", { error, products });
    }
  } else if (file) {
    const thumbnail = "products/" + file.originalname;
    fs.renameSync(file.path, path.resolve("src/public/images", thumbnail));
    product["thumbnail"] = thumbnail;
  }

  if (product.sale <= 100) {
    product.salePrice = product.price - (product.sale * product.price) / 100;
  } else {
    product.salePrice = product.price - product.sale;
  }

  await productModel.findByIdAndUpdate(id, product);
  req.flash("success", "Cập nhật thành công !");
  res.redirect("/admin/product");
};

const restore = async (req, res) => {
  const id = req.params.id;
  await productModel.restore({ _id: id });
  req.flash("success", "Khôi phục thành công !");
  res.redirect("/admin/product/trash");
};

const force = async (req, res) => {
  const id = req.params.id;
  await productModel.deleteOne({ _id: id });
  req.flash("success", "Xóa thành công !");
  res.redirect("/admin/product/trash");
};

const remove = async (req, res) => {
  const id = req.params.id;
  await productModel.delete({ _id: id });
  req.flash("success", "Xóa thành công !");
  res.redirect("/admin/product");
};

const search = async (req, res) => {
  const keyword = req.query.keyword || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = page * limit - limit;
  const total = await productModel.find({
    $or: [
      { name: { $regex: new RegExp(keyword, "i") } },
      {
        cat_id: {
          $in: await categoryModel
            .find({ title: { $regex: new RegExp(keyword, "i") } })
            .distinct("_id"),
        },
      },
    ],
  });
  const totalPages = Math.ceil(total.length / limit);
  const next = page + 1;
  const prev = page - 1;
  const hasNext = page < totalPages ? true : false;
  const hasPrev = page > 1 ? true : false;
  const products = await productModel
    .find({
      $or: [
        { name: { $regex: new RegExp(keyword, "i") } },
        {
          cat_id: {
            $in: await categoryModel
              .find({ title: { $regex: new RegExp(keyword, "i") } })
              .distinct("_id"),
          },
        },
      ],
    })
    .sort({ _id: -1 })
    .populate({ path: "cat_id" })
    .skip(skip)
    .limit(limit);
  const productRemove = await productModel.countWithDeleted({
    deleted: true,
  });
  res.render("admin/products/search-product", {
    products,
    productRemove,
    keyword,
    page,
    next,
    prev,
    hasNext,
    hasPrev,
    pages: pagination(page, totalPages),
  });
};

const restock = (req, res) => {
  const productId = req.params.id;
  const { new_quantity } = req.body;

  const newPurchase = {
    date: new Date(),
    quantity: new_quantity,
  };

  productModel.findByIdAndUpdate(
    productId,
    {
      $push: { purchaseHistory: newPurchase },
      $inc: { quantity: newPurchase.quantity },
    },
    { new: true, useFindAndModify: false },
    (err, updatedProduct) => {
      if (err) {
        req.flash("success", "Lỗi khi cập nhật sản phẩm !");
      } else {
        req.flash("success", "Cập nhật số lượng sản phẩm thành công !");
      }
      res.redirect("/admin/product");
    }
  );
};

module.exports = {
  index,
  trash,
  create,
  store,
  edit,
  update,
  restore,
  remove,
  force,
  search,
  restock,
};
