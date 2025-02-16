const orderModel = require("../../models/order");
const productModel = require("../../models/product");
const { format } = require("date-fns");

// thống kế doanh thu 10 ngày gần nhất
const getRevenueByLast10Days = async (startDate, endDate) => {
  try {
    const today = new Date();
    const revenueByLast10Days = [];

    // Lặp qua 10 ngày gần nhất
    for (let i = 0; i < 10; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() - i); // Đặt ngày là ngày i trước đó

      // Lấy ngày bắt đầu và kết thúc của ngày hiện tại
      const startOfDay = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        0,
        0,
        0
      ); // Ngày bắt đầu của ngày hiện tại
      const endOfDay = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        23,
        59,
        59
      ); // Ngày kết thúc của ngày hiện tại

      // Truy vấn doanh thu cho ngày hiện tại
      const revenueOfDay = await orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
            status: "Đã giao hàng",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$totalPrice",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalRevenue: 1,
          },
        },
      ]);

      // Thêm kết quả vào mảng
      const formattedDate = currentDate.toISOString().split("T")[0]; // Lấy ngày dưới dạng "YYYY-MM-DD"
      revenueByLast10Days.push({
        date: formattedDate,
        totalRevenue:
          revenueOfDay.length > 0 ? revenueOfDay[0].totalRevenue : 0, // Nếu có doanh thu, lấy tổng doanh thu, ngược lại lấy 0
      });
    }

    return revenueByLast10Days;
  } catch (error) {
    console.error("Lỗi khi tính toán doanh thu theo 10 ngày gần nhất:", error);
    throw error;
  }
};

// thống kê doanh thu theo các ngày trong tuần
const getRevenueByWeekday = async () => {
  try {
    const today = new Date();
    const revenueByWeekday = [];

    // Lặp qua 7 ngày gần nhất
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - today.getDay() + i
      ); // Ngày trong tuần, bắt đầu từ thứ 2 và kết thúc vào chủ nhật

      // Truy vấn doanh thu cho ngày hiện tại
      const revenueOfDay = await orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: currentDay,
              $lt: new Date(
                currentDay.getFullYear(),
                currentDay.getMonth(),
                currentDay.getDate() + 1
              ),
            },
            status: "Đã giao hàng",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$totalPrice",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalRevenue: 1,
          },
        },
      ]);

      // Thêm kết quả vào mảng
      const dayOfWeek = currentDay.toLocaleDateString(undefined, {
        weekday: "long",
      });
      revenueByWeekday.push({
        dayOfWeek,
        totalRevenue:
          revenueOfDay.length > 0 ? revenueOfDay[0].totalRevenue : 0, // Nếu có doanh thu, lấy tổng doanh thu, ngược lại lấy 0
      });
    }

    return revenueByWeekday;
  } catch (error) {
    console.error("Lỗi khi tính toán doanh thu theo ngày trong tuần:", error);
    throw error;
  }
};

// thống kê doanh thu theo 12 tháng gần nhất
const getRevenueByMonth = async () => {
  try {
    const today = new Date();
    const revenueBy12Months = [];

    // Lặp qua 12 tháng gần nhất
    for (let i = 0; i < 12; i++) {
      const startOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1
      ); // Ngày đầu tiên của tháng
      const endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() - i + 1,
        0
      ); // Ngày cuối cùng của tháng

      // Truy vấn doanh thu cho tháng hiện tại
      const revenueOfMonth = await orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
            status: "Đã giao hàng",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$totalPrice",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalRevenue: 1,
          },
        },
      ]);

      // Thêm kết quả vào mảng
      const monthYear = `${
        startOfMonth.getMonth() + 1
      }-${startOfMonth.getFullYear()}`;
      revenueBy12Months.push({
        monthYear,
        totalRevenue:
          revenueOfMonth.length > 0 ? revenueOfMonth[0].totalRevenue : 0, // Nếu có doanh thu, lấy tổng doanh thu, ngược lại lấy 0
      });
    }

    return revenueBy12Months;
  } catch (error) {
    console.error("Lỗi khi tính toán doanh thu theo tháng:", error);
    throw error;
  }
};

// lấy theo doanh thu ngày ngày tuỳ chọn theo thời gian
const getRevenueByCustomDates = async (startDate, endDate) => {
  try {
    // Tạo mảng các ngày trong khoảng thời gian
    const datesInRange = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      datesInRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Truy vấn doanh thu cho từng ngày trong khoảng thời gian
    const revenueOfCustomDates = await Promise.all(
      datesInRange.map(async (date) => {
        const startOfDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          0,
          0,
          0
        );
        const endOfDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59
        );

        // Truy vấn doanh thu cho ngày hiện tại
        const revenueForDate = await orderModel.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfDate,
                $lte: endOfDate,
              },
              status: "Đã giao hàng",
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$totalPrice",   
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalRevenue: 1,
            },
          },
        ]);

        // Định dạng ngày
        const formattedDate = format(date, "dd/MM/yyyy");
        // Trả về kết quả doanh thu cho ngày hiện tại
        return {
          date: formattedDate,
          totalRevenue:
            revenueForDate.length > 0 ? revenueForDate[0].totalRevenue : 0,
        };
      })
    );

    return revenueOfCustomDates;
  } catch (error) {
    console.error("Lỗi khi tính toán doanh thu theo ngày tuỳ chọn:", error);
    throw error;
  }
};

// xử lý thời gian
const handleTime = async (req, res) => {
  const { startDate, endDate } = req.body;
  const startTime = new Date(startDate);
  const endTime = new Date(endDate);
  const result = await getRevenueByCustomDates(startTime, endTime);
  const resulttotalRevenue = result.map((e) => e.totalRevenue);
  const resulttotalDate = result.map((e) => e.date);

  const dataDateChoose = {
    chartType: "bar",
    labels: resulttotalDate,
    datasetLabel: "Number of Votes",
    data: resulttotalRevenue,
    backgroundColor: "rgba(255, 99, 132, 0.2)",
    borderColor: "rgba(255, 99, 132, 1)",
  };
  res.json(dataDateChoose);
};

const index = async (req, res) => {
  // data follow day (10)
  const recentOrders = await getRevenueByLast10Days(); // Chờ đợi hàm hoàn thành
  const labelsDay = recentOrders.map((order) => order.date).reverse();
  const dataDay = recentOrders.map((order) => order.totalRevenue).reverse();
  const dataDate = {
    chartType: "bar",
    labels: labelsDay,
    datasetLabel: "Number of Votes",
    data: dataDay,
    backgroundColor: "rgba(255, 99, 132, 0.2)",
    borderColor: "rgba(255, 99, 132, 1)",
  };

  // data follow week
  const recentOrdersOfWeek = await getRevenueByWeekday();
  const labelsWeek = recentOrdersOfWeek.map((order) => order.dayOfWeek);
  const dataWeek = recentOrdersOfWeek.map((order) => order.totalRevenue);
  const charWeekly = {
    chartType: "bar",
    labels: labelsWeek,
    datasetLabel: "Number of Votes",
    data: dataWeek,
    backgroundColor: "rgba(255, 99, 132, 0.2)",
    borderColor: "rgba(255, 99, 132, 1)",
  };

  // data follow month
  const recentOfMonth = await getRevenueByMonth();
  const labelYear = recentOfMonth.map((item) => item.monthYear).reverse();
  const dataMonth = recentOfMonth.map((item) => item.totalRevenue).reverse();
  const chartMonth = {
    chartType: "bar",
    labels: labelYear,
    datasetLabel: "Number of Votes",
    data: dataMonth,
    backgroundColor: "rgba(255, 99, 132, 0.2)",
    borderColor: "rgba(255, 99, 132, 1)",
  };

  res.render("admin/statistical/statistical", {
    chartMonth: chartMonth,
    chartDate: dataDate,
    charWeekly: charWeekly,
  });
};

module.exports = {
  index,
  handleTime,
};
