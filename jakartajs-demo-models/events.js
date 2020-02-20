'use strict';

module.exports = (DBContext, DataTypes) => {
    const Events = DBContext.define('Events', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        uuid: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'events',
        freezeTableName: true,
        underscored: true
    });

    Events.associate = (models) => {
        Events.hasMany(models.Participants, {
            foreignKey: 'event_id'
        });
    };

    return Events;
};
